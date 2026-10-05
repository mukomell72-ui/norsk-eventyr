-- Norsk Eventyr 7.4.0: owner admin dashboard, lifecycle timeline and payment-ready ledger.
-- Apply AFTER migrations/20261005_growth_funnel.sql.
-- No client or authenticated user can write payment/subscription records.

create table if not exists public.norsk_eventyr_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  event_key text unique,
  occurred_at timestamptz not null default now(),
  source text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ne_lifecycle_event_type_len check (char_length(event_type) between 1 and 64),
  constraint ne_lifecycle_event_key_len check (event_key is null or char_length(event_key) <= 180),
  constraint ne_lifecycle_source_len check (char_length(source) between 1 and 24),
  constraint ne_lifecycle_metadata_object check (jsonb_typeof(metadata)='object')
);
alter table public.norsk_eventyr_lifecycle_events enable row level security;
revoke all on table public.norsk_eventyr_lifecycle_events from public,anon,authenticated;
create index if not exists ne_lifecycle_user_time_idx on public.norsk_eventyr_lifecycle_events(user_id,occurred_at desc);
create index if not exists ne_lifecycle_type_time_idx on public.norsk_eventyr_lifecycle_events(event_type,occurred_at desc);

create table if not exists public.norsk_eventyr_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null default 'inactive'
    check(status in ('inactive','trialing','active','past_due','unpaid','canceled','paused')),
  plan_code text not null default 'monthly_99',
  amount_nok numeric(12,2) not null default 99.00 check(amount_nok >= 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ne_subscription_provider_len check(char_length(provider) between 1 and 32),
  constraint ne_subscription_customer_len check(provider_customer_id is null or char_length(provider_customer_id)<=180),
  constraint ne_subscription_id_len check(provider_subscription_id is null or char_length(provider_subscription_id)<=180),
  constraint ne_subscription_plan_len check(char_length(plan_code) between 1 and 80)
);
alter table public.norsk_eventyr_subscriptions enable row level security;
revoke all on table public.norsk_eventyr_subscriptions from public,anon,authenticated;
create index if not exists ne_subscriptions_status_idx on public.norsk_eventyr_subscriptions(status,current_period_end);

create table if not exists public.norsk_eventyr_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  provider_event_id text unique,
  provider_payment_id text,
  provider_subscription_id text,
  status text not null default 'pending'
    check(status in ('pending','paid','failed','refunded','partially_refunded','canceled')),
  currency text not null default 'NOK' check(currency='NOK'),
  amount_nok numeric(12,2) not null default 0 check(amount_nok >= 0),
  fee_nok numeric(12,2) not null default 0 check(fee_nok >= 0),
  refunded_nok numeric(12,2) not null default 0 check(refunded_nok >= 0 and refunded_nok <= amount_nok),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ne_payment_provider_len check(char_length(provider) between 1 and 32),
  constraint ne_payment_event_id_len check(provider_event_id is null or char_length(provider_event_id)<=180),
  constraint ne_payment_id_len check(provider_payment_id is null or char_length(provider_payment_id)<=180),
  constraint ne_payment_subscription_id_len check(provider_subscription_id is null or char_length(provider_subscription_id)<=180),
  constraint ne_payment_failure_code_len check(failure_code is null or char_length(failure_code)<=120),
  constraint ne_payment_failure_message_len check(failure_message is null or char_length(failure_message)<=500)
);
alter table public.norsk_eventyr_payments enable row level security;
revoke all on table public.norsk_eventyr_payments from public,anon,authenticated;
create index if not exists ne_payments_user_time_idx on public.norsk_eventyr_payments(user_id,created_at desc);
create index if not exists ne_payments_status_time_idx on public.norsk_eventyr_payments(status,created_at desc);
create index if not exists ne_payments_paid_time_idx on public.norsk_eventyr_payments(paid_at desc) where paid_at is not null;

create or replace function public.ne_lifecycle_record(
  p_user_id uuid,
  p_event_type text,
  p_occurred_at timestamptz default now(),
  p_source text default 'system',
  p_metadata jsonb default '{}'::jsonb,
  p_event_key text default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_user_id is null
     or not exists(select 1 from auth.users where id=p_user_id)
     or char_length(coalesce(p_event_type,'')) not between 1 and 64 then
    return;
  end if;

  insert into public.norsk_eventyr_lifecycle_events(
    user_id,event_type,event_key,occurred_at,source,metadata
  ) values (
    p_user_id,
    left(p_event_type,64),
    case when nullif(p_event_key,'') is null then null else left(p_event_key,180) end,
    coalesce(p_occurred_at,now()),
    left(coalesce(nullif(p_source,''),'system'),24),
    case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end
  )
  on conflict(event_key) do update
    set occurred_at=excluded.occurred_at,
        source=excluded.source,
        metadata=excluded.metadata;
end;
$$;
revoke all on function public.ne_lifecycle_record(uuid,text,timestamptz,text,jsonb,text) from public,anon,authenticated;

create or replace function public.ne_entitlement_lifecycle_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform public.ne_lifecycle_record(new.user_id,'trial_started',new.trial_started_at,'system',
      jsonb_build_object('trial_ends_at',new.trial_ends_at),
      'trial_started:'||new.user_id::text);
    perform public.ne_lifecycle_record(new.user_id,'trial_ends',new.trial_ends_at,'system',
      '{}'::jsonb,'trial_ends:'||new.user_id::text);
  elsif new.trial_ends_at is distinct from old.trial_ends_at then
    perform public.ne_lifecycle_record(new.user_id,'trial_ends',new.trial_ends_at,'system',
      jsonb_build_object('previous_trial_ends_at',old.trial_ends_at),
      'trial_ends:'||new.user_id::text);
  end if;

  if new.terms_accepted_at is not null and (
     tg_op='INSERT'
     or new.terms_version is distinct from old.terms_version
     or new.privacy_version is distinct from old.privacy_version
     or new.privacy_accepted_at is distinct from old.privacy_accepted_at
  ) then
    perform public.ne_lifecycle_record(new.user_id,'terms_accepted',
      greatest(new.terms_accepted_at,new.privacy_accepted_at),'user',
      jsonb_build_object('terms_version',new.terms_version,'privacy_version',new.privacy_version),
      'terms:'||new.user_id::text||':'||coalesce(new.terms_version,'')||':'||coalesce(new.privacy_version,''));
  end if;

  if new.purchase_interest_at is not null and (
     tg_op='INSERT' or old.purchase_interest_at is null
  ) then
    perform public.ne_lifecycle_record(new.user_id,'purchase_interest',new.purchase_interest_at,'user',
      jsonb_build_object('price_nok',new.purchase_interest_price_nok),
      'purchase_interest:'||new.user_id::text);
  end if;

  if coalesce(new.activity_days_count,0)>=3 and (
     tg_op='INSERT' or coalesce(old.activity_days_count,0)<3
  ) then
    perform public.ne_lifecycle_record(new.user_id,'active_3_days',now(),'system',
      jsonb_build_object('activity_days_count',new.activity_days_count),
      'active_3_days:'||new.user_id::text);
  end if;

  if new.first_paid_at is not null and (
     tg_op='INSERT' or old.first_paid_at is null
  ) then
    perform public.ne_lifecycle_record(new.user_id,'first_paid',new.first_paid_at,'payment',
      '{}'::jsonb,'first_paid:'||new.user_id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists ne_entitlement_lifecycle on public.norsk_eventyr_entitlements;
create trigger ne_entitlement_lifecycle
after insert or update on public.norsk_eventyr_entitlements
for each row execute function public.ne_entitlement_lifecycle_trigger();

create or replace function public.ne_install_lifecycle_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform public.ne_lifecycle_record(new.user_id,'installed',new.first_installed_at,'user',
      jsonb_build_object('platform',new.platform,'install_source',new.source),
      'installed:'||new.user_id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists ne_install_lifecycle on public.norsk_eventyr_installs;
create trigger ne_install_lifecycle
after insert on public.norsk_eventyr_installs
for each row execute function public.ne_install_lifecycle_trigger();

create or replace function public.ne_access_lifecycle_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform public.ne_lifecycle_record(new.user_id,'access_requested',new.requested_at,'user',
      jsonb_build_object('status',new.status),
      'access_requested:'||new.user_id::text);
  end if;
  if tg_op='UPDATE' and new.status is distinct from old.status then
    perform public.ne_lifecycle_record(new.user_id,'access_'||new.status,coalesce(new.decided_at,now()),'owner',
      jsonb_build_object('status',new.status),
      null);
  end if;
  return new;
end;
$$;
drop trigger if exists ne_access_lifecycle on public.norsk_eventyr_access;
create trigger ne_access_lifecycle
after insert or update on public.norsk_eventyr_access
for each row execute function public.ne_access_lifecycle_trigger();

create or replace function public.ne_payment_lifecycle_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  when_at timestamptz;
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    when_at:=coalesce(new.paid_at,new.updated_at,new.created_at,now());
    perform public.ne_lifecycle_record(
      new.user_id,
      'payment_'||new.status,
      when_at,
      'payment',
      jsonb_build_object(
        'payment_id',new.id,
        'amount_nok',new.amount_nok,
        'fee_nok',new.fee_nok,
        'refunded_nok',new.refunded_nok,
        'period_start',new.period_start,
        'period_end',new.period_end,
        'provider',new.provider,
        'failure_code',new.failure_code
      ),
      'payment:'||new.id::text||':'||new.status
    );
  end if;

  if new.status='paid' and new.paid_at is not null then
    update public.norsk_eventyr_entitlements
      set first_paid_at=coalesce(first_paid_at,new.paid_at),updated_at=now()
      where user_id=new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists ne_payment_lifecycle on public.norsk_eventyr_payments;
create trigger ne_payment_lifecycle
after insert or update of status on public.norsk_eventyr_payments
for each row execute function public.ne_payment_lifecycle_trigger();

create or replace function public.ne_subscription_lifecycle_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform public.ne_lifecycle_record(new.user_id,'subscription_'||new.status,new.created_at,'payment',
      jsonb_build_object('status',new.status,'plan_code',new.plan_code,'amount_nok',new.amount_nok,
                         'period_start',new.current_period_start,'period_end',new.current_period_end,
                         'cancel_at_period_end',new.cancel_at_period_end),
      'subscription:'||new.user_id::text||':'||new.status||':'||coalesce(new.current_period_start::text,'initial'));
  elsif new.status is distinct from old.status
     or new.current_period_end is distinct from old.current_period_end
     or new.cancel_at_period_end is distinct from old.cancel_at_period_end then
    perform public.ne_lifecycle_record(new.user_id,'subscription_updated',now(),'payment',
      jsonb_build_object('status',new.status,'plan_code',new.plan_code,'amount_nok',new.amount_nok,
                         'period_start',new.current_period_start,'period_end',new.current_period_end,
                         'cancel_at_period_end',new.cancel_at_period_end),
      null);
  end if;
  return new;
end;
$$;
drop trigger if exists ne_subscription_lifecycle on public.norsk_eventyr_subscriptions;
create trigger ne_subscription_lifecycle
after insert or update on public.norsk_eventyr_subscriptions
for each row execute function public.ne_subscription_lifecycle_trigger();

-- Backfill milestones already known before 7.4.0.
insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select u.id,'email_confirmed','email_confirmed:'||u.id::text,u.email_confirmed_at,'system','{}'::jsonb
from auth.users u
where u.email_confirmed_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do nothing;

insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select e.user_id,'trial_started','trial_started:'||e.user_id::text,e.trial_started_at,'system',
       jsonb_build_object('trial_ends_at',e.trial_ends_at)
from public.norsk_eventyr_entitlements e
join auth.users u on u.id=e.user_id
where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do nothing;

insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select e.user_id,'trial_ends','trial_ends:'||e.user_id::text,e.trial_ends_at,'system','{}'::jsonb
from public.norsk_eventyr_entitlements e
join auth.users u on u.id=e.user_id
where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do update set occurred_at=excluded.occurred_at;

insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select e.user_id,'terms_accepted',
       'terms:'||e.user_id::text||':'||coalesce(e.terms_version,'')||':'||coalesce(e.privacy_version,''),
       greatest(e.terms_accepted_at,e.privacy_accepted_at),'user',
       jsonb_build_object('terms_version',e.terms_version,'privacy_version',e.privacy_version)
from public.norsk_eventyr_entitlements e
join auth.users u on u.id=e.user_id
where e.terms_accepted_at is not null and e.privacy_accepted_at is not null
  and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do nothing;

insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select i.user_id,'installed','installed:'||i.user_id::text,i.first_installed_at,'user',
       jsonb_build_object('platform',i.platform,'install_source',i.source)
from public.norsk_eventyr_installs i
join auth.users u on u.id=i.user_id
where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do nothing;

insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select e.user_id,'purchase_interest','purchase_interest:'||e.user_id::text,e.purchase_interest_at,'user',
       jsonb_build_object('price_nok',e.purchase_interest_price_nok)
from public.norsk_eventyr_entitlements e
join auth.users u on u.id=e.user_id
where e.purchase_interest_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do nothing;

insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
select a.user_id,'access_requested','access_requested:'||a.user_id::text,a.requested_at,'user',
       jsonb_build_object('status',a.status)
from public.norsk_eventyr_access a
join auth.users u on u.id=a.user_id
where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
on conflict(event_key) do nothing;

create or replace function public.ne_lifecycle_touch()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare u auth.users;
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform public.ne_lifecycle_record(u.id,'email_confirmed',u.email_confirmed_at,'system','{}'::jsonb,
    'email_confirmed:'||u.id::text);
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.ne_lifecycle_touch() from public,anon;
grant execute on function public.ne_lifecycle_touch() to authenticated;

create or replace function public.ne_owner_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return jsonb_build_object(
    'users',(select count(*) from auth.users u where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'confirmed',(select count(*) from auth.users u where u.email_confirmed_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'active_trials',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.trial_ends_at>now() and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'expired_trials',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.trial_ends_at<=now() and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'purchase_interest',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.purchase_interest_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'active_paid',(select count(*) from public.norsk_eventyr_subscriptions s join auth.users u on u.id=s.user_id where s.status in ('trialing','active') and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'past_due',(select count(*) from public.norsk_eventyr_subscriptions s where s.status in ('past_due','unpaid')),
    'revenue_30d',coalesce((select round(sum(greatest(p.amount_nok-p.refunded_nok,0)),2) from public.norsk_eventyr_payments p where p.status in ('paid','refunded','partially_refunded') and coalesce(p.paid_at,p.created_at)>=now()-interval '30 days'),0),
    'fees_30d',coalesce((select round(sum(p.fee_nok),2) from public.norsk_eventyr_payments p where p.status in ('paid','refunded','partially_refunded') and coalesce(p.paid_at,p.created_at)>=now()-interval '30 days'),0),
    'failed_payments_7d',(select count(*) from public.norsk_eventyr_payments p where p.status='failed' and p.created_at>=now()-interval '7 days'),
    'renewals_7d',(select count(*) from public.norsk_eventyr_subscriptions s where s.status='active' and s.cancel_at_period_end=false and s.current_period_end between now() and now()+interval '7 days'),
    'errors_24h',(select count(*) from public.norsk_eventyr_client_errors e where e.created_at>=now()-interval '24 hours')
  );
end;
$$;

create or replace function public.ne_owner_lifecycle_feed(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare lim integer := greatest(1,least(coalesce(p_limit,100),300));
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',x.id,'user_id',x.user_id,'email',x.email,'event_type',x.event_type,
      'occurred_at',x.occurred_at,'source',x.source,'metadata',x.metadata
    ) order by x.occurred_at desc,x.id desc)
    from (
      select e.id,e.user_id,u.email,e.event_type,e.occurred_at,e.source,e.metadata
      from public.norsk_eventyr_lifecycle_events e
      join auth.users u on u.id=e.user_id
      where e.occurred_at<=now()
        and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
      order by e.occurred_at desc,e.id desc
      limit lim
    ) x
  ),'[]'::jsonb);
end;
$$;

create or replace function public.ne_owner_payments(p_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare lim integer := greatest(1,least(coalesce(p_limit,200),500));
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',x.id,'user_id',x.user_id,'email',x.email,'provider',x.provider,
      'provider_payment_id',x.provider_payment_id,'provider_subscription_id',x.provider_subscription_id,
      'status',x.status,'currency',x.currency,'amount_nok',x.amount_nok,'fee_nok',x.fee_nok,
      'refunded_nok',x.refunded_nok,'period_start',x.period_start,'period_end',x.period_end,
      'paid_at',x.paid_at,'failure_code',x.failure_code,'failure_message',x.failure_message,
      'created_at',x.created_at
    ) order by x.created_at desc,x.id desc)
    from (
      select p.*,u.email
      from public.norsk_eventyr_payments p
      join auth.users u on u.id=p.user_id
      order by p.created_at desc,p.id desc
      limit lim
    ) x
  ),'[]'::jsonb);
end;
$$;

create or replace function public.ne_owner_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare profile jsonb; timeline jsonb; payments jsonb;
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if p_user_id is null then raise exception 'BAD_USER'; end if;

  select jsonb_build_object(
    'user_id',u.id,'email',u.email,'registered_at',u.created_at,'email_confirmed_at',u.email_confirmed_at,
    'display_name',coalesce(a.display_name,''),'access_status',coalesce(a.status,'unrequested'),
    'requested_at',a.requested_at,'decided_at',a.decided_at,
    'trial_started_at',e.trial_started_at,'trial_ends_at',e.trial_ends_at,
    'terms_version',e.terms_version,'privacy_version',e.privacy_version,
    'terms_accepted_at',e.terms_accepted_at,'privacy_accepted_at',e.privacy_accepted_at,
    'activity_days_count',coalesce(e.activity_days_count,0),
    'purchase_interest_at',e.purchase_interest_at,'purchase_interest_price_nok',e.purchase_interest_price_nok,
    'first_installed_at',i.first_installed_at,'last_seen_installed_at',i.last_seen_installed_at,
    'install_platform',i.platform,'install_source',i.source,
    'acquisition_source',case when e.referred_by is not null then 'referral' else coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct') end,
    'acquisition_campaign',left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_campaign','')),80),
    'subscription_status',coalesce(s.status,'inactive'),'plan_code',s.plan_code,
    'subscription_amount_nok',s.amount_nok,'paid_until',s.current_period_end,
    'current_period_start',s.current_period_start,'next_payment_at',case when s.status='active' and not s.cancel_at_period_end then s.current_period_end else null end,
    'cancel_at_period_end',coalesce(s.cancel_at_period_end,false),'canceled_at',s.canceled_at
  ) into profile
  from auth.users u
  left join public.norsk_eventyr_entitlements e on e.user_id=u.id
  left join public.norsk_eventyr_access a on a.user_id=u.id
  left join public.norsk_eventyr_installs i on i.user_id=u.id
  left join public.norsk_eventyr_subscriptions s on s.user_id=u.id
  where u.id=p_user_id;

  if profile is null then raise exception 'USER_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'event_type',e.event_type,'occurred_at',e.occurred_at,
    'source',e.source,'metadata',e.metadata
  ) order by e.occurred_at desc,e.id desc),'[]'::jsonb)
  into timeline
  from public.norsk_eventyr_lifecycle_events e
  where e.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'status',p.status,'amount_nok',p.amount_nok,'fee_nok',p.fee_nok,
    'refunded_nok',p.refunded_nok,'period_start',p.period_start,'period_end',p.period_end,
    'paid_at',p.paid_at,'created_at',p.created_at,'provider',p.provider,
    'failure_code',p.failure_code,'failure_message',p.failure_message
  ) order by p.created_at desc,p.id desc),'[]'::jsonb)
  into payments
  from public.norsk_eventyr_payments p
  where p.user_id=p_user_id;

  return jsonb_build_object('profile',profile,'timeline',timeline,'payments',payments);
end;
$$;

create or replace function public.ne_access_list()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',u.id,'email',u.email,'registered_at',u.created_at,'email_confirmed_at',u.email_confirmed_at,
      'display_name',coalesce(a.display_name,''),'status',coalesce(a.status,'unrequested'),
      'requested_at',a.requested_at,'decided_at',a.decided_at,
      'trial_started_at',e.trial_started_at,'trial_ends_at',e.trial_ends_at,
      'referral_bonus_granted_at',e.referral_bonus_granted_at,'terms_accepted_at',e.terms_accepted_at,
      'first_installed_at',i.first_installed_at,'last_seen_installed_at',i.last_seen_installed_at,
      'install_platform',i.platform,'install_source',i.source,
      'activity_days_count',coalesce(e.activity_days_count,0),
      'purchase_interest_at',e.purchase_interest_at,'purchase_interest_price_nok',e.purchase_interest_price_nok,
      'first_paid_at',e.first_paid_at,
      'acquisition_source',case when e.referred_by is not null then 'referral' else coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct') end,
      'acquisition_campaign',left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_campaign','')),80),
      'subscription_status',coalesce(s.status,'inactive'),'plan_code',s.plan_code,
      'subscription_amount_nok',s.amount_nok,'paid_until',s.current_period_end,
      'next_payment_at',case when s.status='active' and not s.cancel_at_period_end then s.current_period_end else null end,
      'cancel_at_period_end',coalesce(s.cancel_at_period_end,false),
      'last_payment_status',lp.status,'last_payment_at',coalesce(lp.paid_at,lp.created_at),'last_payment_amount_nok',lp.amount_nok
    ) order by coalesce(lp.paid_at,lp.created_at,i.first_installed_at,e.trial_started_at,u.created_at) desc)
    from auth.users u
    left join public.norsk_eventyr_entitlements e on e.user_id=u.id
    left join public.norsk_eventyr_access a on a.user_id=u.id
    left join public.norsk_eventyr_installs i on i.user_id=u.id
    left join public.norsk_eventyr_subscriptions s on s.user_id=u.id
    left join lateral (
      select p.status,p.paid_at,p.created_at,p.amount_nok
      from public.norsk_eventyr_payments p
      where p.user_id=u.id
      order by p.created_at desc,p.id desc limit 1
    ) lp on true
    where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
  ),'[]'::jsonb);
end;
$$;

create or replace function public.ne_owner_backup()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return jsonb_build_object(
  'format','norsk-eventyr-backup-v3',
  'created_at',now(),
  'users',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',u.id,'email',u.email,'created_at',u.created_at,'email_confirmed_at',u.email_confirmed_at,
      'acquisition_source',coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct'),
      'acquisition_campaign',left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_campaign','')),80)
    ) order by u.created_at)
    from auth.users u where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
  ),'[]'::jsonb),
  'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.norsk_eventyr_entitlements e),'[]'::jsonb),
  'access',coalesce((select jsonb_agg(to_jsonb(a) order by a.requested_at) from public.norsk_eventyr_access a),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.norsk_eventyr_feedback f),'[]'::jsonb),
  'installs',coalesce((select jsonb_agg(to_jsonb(i) order by i.first_installed_at) from public.norsk_eventyr_installs i),'[]'::jsonb),
  'growth_daily',coalesce((select jsonb_agg(to_jsonb(g) order by g.day) from public.norsk_eventyr_growth_daily g),'[]'::jsonb),
  'subscriptions',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.norsk_eventyr_subscriptions s),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.norsk_eventyr_payments p),'[]'::jsonb),
  'lifecycle_events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at) from public.norsk_eventyr_lifecycle_events e),'[]'::jsonb),
  'client_errors',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select * from public.norsk_eventyr_client_errors order by created_at desc limit 500) e),'[]'::jsonb)
 );
end;
$$;

revoke all on function public.ne_owner_admin_overview(),public.ne_owner_lifecycle_feed(integer),
 public.ne_owner_payments(integer),public.ne_owner_user_detail(uuid),public.ne_owner_backup()
 from public,anon;
grant execute on function public.ne_owner_admin_overview(),public.ne_owner_lifecycle_feed(integer),
 public.ne_owner_payments(integer),public.ne_owner_user_detail(uuid),public.ne_owner_backup()
 to authenticated;
