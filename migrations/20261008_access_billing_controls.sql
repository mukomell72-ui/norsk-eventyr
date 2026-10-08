-- Norsk Eventyr 8.0.1: time-bound access, free grants, promo codes, manual paid periods and device controls.
-- Additive migration. Apply once during the 8.0.1 release only after Preview QA passes.

begin;

alter table public.norsk_eventyr_entitlements
  add column if not exists free_access_until timestamptz,
  add column if not exists ready_bonus_granted_at timestamptz;

create table if not exists public.norsk_eventyr_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_type text not null check(grant_type in ('ready_bonus','owner_free','promo','migration_grace')),
  days integer not null check(days between 1 and 3650),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  promo_code text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ne_access_grant_period check(ends_at>starts_at),
  constraint ne_access_grant_promo_len check(promo_code is null or char_length(promo_code) between 4 and 32),
  constraint ne_access_grant_note_len check(note is null or char_length(note)<=300)
);
alter table public.norsk_eventyr_access_grants enable row level security;
revoke all on table public.norsk_eventyr_access_grants from public,anon,authenticated;
create index if not exists ne_access_grants_user_time_idx on public.norsk_eventyr_access_grants(user_id,created_at desc);

create table if not exists public.norsk_eventyr_promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  duration_days integer not null check(duration_days between 1 and 3650),
  max_redemptions integer not null default 1 check(max_redemptions between 1 and 100000),
  redemption_count integer not null default 0 check(redemption_count>=0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  active boolean not null default true,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ne_promo_code_format check(code ~ '^[A-Z0-9_-]{4,32}$'),
  constraint ne_promo_window check(valid_until is null or valid_until>valid_from),
  constraint ne_promo_note_len check(note is null or char_length(note)<=300)
);
alter table public.norsk_eventyr_promo_codes enable row level security;
revoke all on table public.norsk_eventyr_promo_codes from public,anon,authenticated;
create index if not exists ne_promo_active_idx on public.norsk_eventyr_promo_codes(active,valid_until);

create table if not exists public.norsk_eventyr_promo_redemptions (
  promo_id uuid not null references public.norsk_eventyr_promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  granted_until timestamptz not null,
  primary key(promo_id,user_id)
);
alter table public.norsk_eventyr_promo_redemptions enable row level security;
revoke all on table public.norsk_eventyr_promo_redemptions from public,anon,authenticated;
create index if not exists ne_promo_redemptions_user_idx on public.norsk_eventyr_promo_redemptions(user_id,redeemed_at desc);

create table if not exists public.norsk_eventyr_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text not null default 'Устройство',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(user_id,device_id),
  constraint ne_device_id_format check(device_id ~ '^[A-Za-z0-9_-]{16,80}$'),
  constraint ne_device_name_len check(char_length(device_name) between 1 and 120)
);
alter table public.norsk_eventyr_devices enable row level security;
revoke all on table public.norsk_eventyr_devices from public,anon,authenticated;
create index if not exists ne_devices_user_active_idx on public.norsk_eventyr_devices(user_id,revoked_at,last_seen_at desc);

-- Preserve users that were already explicitly approved under 8.0.0.
-- They receive one 30-day transition window rather than suddenly losing access.
with candidates as (
  select e.user_id,
         greatest(now(),e.trial_ends_at,coalesce(e.free_access_until,now())) as start_at
  from public.norsk_eventyr_entitlements e
  join public.norsk_eventyr_access a on a.user_id=e.user_id and a.status='approved'
  where coalesce((select raw_app_meta_data->>'ne_owner' from auth.users u where u.id=e.user_id),'false')<>'true'
    and e.free_access_until is null
), changed as (
  update public.norsk_eventyr_entitlements e
  set free_access_until=c.start_at+interval '30 days',updated_at=now()
  from candidates c
  where e.user_id=c.user_id
  returning e.user_id,c.start_at,e.free_access_until
)
insert into public.norsk_eventyr_access_grants(user_id,grant_type,days,starts_at,ends_at,note)
select user_id,'migration_grace',30,start_at,free_access_until,'8.0.1 переход с бессрочного approved-доступа'
from changed;

create or replace function public.ne_access_status()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u auth.users;
  req_status text;
  e public.norsk_eventyr_entitlements%rowtype;
  sub_status text;
  paid_start timestamptz;
  paid_end timestamptz;
  current_terms constant text := '2026-10-05-v1';
  current_privacy constant text := '2026-10-05-v3';
  granted boolean := false;
  effective_status text;
  access_source text;
  remaining bigint := 0;
  has_feedback boolean := false;
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;

  if public.ne_access_owner() then
    return jsonb_build_object(
      'status','owner','request_status','approved','access_granted',true,'owner',true,
      'user_id',u.id,'terms_required',false,'feedback_submitted',true,'feedback_prompt_due',false,
      'terms_version',current_terms,'privacy_version',current_privacy,'accepted_privacy_version',current_privacy,
      'access_source','owner'
    );
  end if;

  select status into req_status from public.norsk_eventyr_access where user_id=u.id;
  select * into e from public.norsk_eventyr_entitlements where user_id=u.id;
  select s.status,s.current_period_start,s.current_period_end
    into sub_status,paid_start,paid_end
  from public.norsk_eventyr_subscriptions s where s.user_id=u.id;
  select exists(select 1 from public.norsk_eventyr_feedback where user_id=u.id) into has_feedback;

  if req_status in ('denied','revoked') then
    effective_status := req_status;
  elsif e.user_id is null
     or e.terms_version is distinct from current_terms
     or coalesce(e.privacy_version,'') not in ('2026-10-05-v1','2026-10-05-v2','2026-10-05-v3')
     or e.terms_accepted_at is null
     or e.privacy_accepted_at is null then
    effective_status := 'terms_required';
  elsif sub_status in ('active','trialing')
     and coalesce(paid_start,now())<=now()
     and paid_end>now() then
    effective_status := 'paid'; granted := true; access_source := 'paid';
    remaining := greatest(0,floor(extract(epoch from (paid_end-now())))::bigint);
  elsif e.free_access_until>now() then
    effective_status := 'free'; granted := true; access_source := 'free';
    remaining := greatest(0,floor(extract(epoch from (e.free_access_until-now())))::bigint);
  elsif e.trial_ends_at>now() then
    effective_status := 'trial'; granted := true; access_source := 'trial';
    remaining := greatest(0,floor(extract(epoch from (e.trial_ends_at-now())))::bigint);
  elsif req_status='pending' then
    effective_status := 'pending';
  else
    effective_status := 'expired';
  end if;

  return jsonb_build_object(
    'status',effective_status,'request_status',coalesce(req_status,'unrequested'),
    'access_granted',granted,'owner',false,'user_id',u.id,
    'terms_required',effective_status='terms_required','terms_version',current_terms,
    'privacy_version',current_privacy,'accepted_privacy_version',e.privacy_version,
    'trial_started_at',e.trial_started_at,'trial_ends_at',e.trial_ends_at,
    'free_access_until',e.free_access_until,'ready_bonus_granted_at',e.ready_bonus_granted_at,
    'subscription_status',coalesce(sub_status,'inactive'),'paid_from',paid_start,'paid_until',paid_end,
    'access_source',access_source,'access_seconds_remaining',remaining,
    'trial_seconds_remaining',case when effective_status='trial' then remaining else 0 end,
    'referral_bonus_granted_at',e.referral_bonus_granted_at,
    'feedback_submitted',has_feedback,
    'feedback_prompt_due',coalesce(e.trial_ends_at<=now(),false) and not has_feedback
  );
end;
$$;

create or replace function public.ne_purchase_interest(p_price_nok integer default 99)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  e public.norsk_eventyr_entitlements%rowtype;
  paid_end timestamptz;
  base_at timestamptz;
  new_until timestamptz;
  did_bonus boolean := false;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if p_price_nok is null or p_price_nok<1 or p_price_nok>100000 then raise exception 'BAD_PRICE'; end if;

  select * into e from public.norsk_eventyr_entitlements where user_id=uid for update;
  if e.user_id is null then raise exception 'ENTITLEMENT_REQUIRED'; end if;
  select current_period_end into paid_end
  from public.norsk_eventyr_subscriptions
  where user_id=uid and status in ('active','trialing') and current_period_end>now();

  if e.ready_bonus_granted_at is null then
    base_at := greatest(now(),e.trial_ends_at,coalesce(e.free_access_until,now()),coalesce(paid_end,now()));
    new_until := base_at+interval '30 days';
    update public.norsk_eventyr_entitlements
    set purchase_interest_at=coalesce(purchase_interest_at,now()),
        purchase_interest_last_at=now(),
        purchase_interest_price_nok=p_price_nok,
        ready_bonus_granted_at=now(),
        free_access_until=new_until,
        updated_at=now()
    where user_id=uid;
    insert into public.norsk_eventyr_access_grants(user_id,grant_type,days,starts_at,ends_at,note)
    values(uid,'ready_bonus',30,base_at,new_until,'Одноразовый бонус после готовности оформить подписку');
    perform public.ne_lifecycle_record(uid,'ready_to_pay_bonus',now(),'user',
      jsonb_build_object('price_nok',p_price_nok,'days',30,'free_access_until',new_until),
      'ready_to_pay_bonus:'||uid::text);
    did_bonus := true;
  else
    update public.norsk_eventyr_entitlements
    set purchase_interest_at=coalesce(purchase_interest_at,now()),
        purchase_interest_last_at=now(),
        purchase_interest_price_nok=p_price_nok,
        updated_at=now()
    where user_id=uid;
  end if;

  return jsonb_build_object('ok',true,'price_nok',p_price_nok,'bonus_granted',did_bonus,
    'free_access_until',(select free_access_until from public.norsk_eventyr_entitlements where user_id=uid));
end;
$$;

create or replace function public.ne_promo_redeem(p_code text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(trim(coalesce(p_code,'')));
  promo public.norsk_eventyr_promo_codes%rowtype;
  e public.norsk_eventyr_entitlements%rowtype;
  paid_end timestamptz;
  base_at timestamptz;
  new_until timestamptz;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'LOGIN_REQUIRED'; end if;
  if normalized !~ '^[A-Z0-9_-]{4,32}$' then raise exception 'BAD_PROMO'; end if;

  select * into promo from public.norsk_eventyr_promo_codes where code=normalized for update;
  if promo.id is null or promo.active is not true or promo.valid_from>now()
     or (promo.valid_until is not null and promo.valid_until<=now())
     or promo.redemption_count>=promo.max_redemptions then raise exception 'PROMO_UNAVAILABLE'; end if;
  if exists(select 1 from public.norsk_eventyr_promo_redemptions where promo_id=promo.id and user_id=uid) then
    raise exception 'PROMO_ALREADY_USED';
  end if;

  select * into e from public.norsk_eventyr_entitlements where user_id=uid for update;
  if e.user_id is null then raise exception 'ENTITLEMENT_REQUIRED'; end if;
  select current_period_end into paid_end from public.norsk_eventyr_subscriptions
   where user_id=uid and status in ('active','trialing') and current_period_end>now();

  base_at := greatest(now(),e.trial_ends_at,coalesce(e.free_access_until,now()),coalesce(paid_end,now()));
  new_until := base_at + make_interval(days=>promo.duration_days);
  update public.norsk_eventyr_entitlements set free_access_until=new_until,updated_at=now() where user_id=uid;
  update public.norsk_eventyr_promo_codes set redemption_count=redemption_count+1,updated_at=now() where id=promo.id;
  insert into public.norsk_eventyr_promo_redemptions(promo_id,user_id,granted_until) values(promo.id,uid,new_until);
  insert into public.norsk_eventyr_access_grants(user_id,grant_type,days,starts_at,ends_at,promo_code,note)
   values(uid,'promo',promo.duration_days,base_at,new_until,promo.code,promo.note);
  perform public.ne_lifecycle_record(uid,'promo_redeemed',now(),'user',
    jsonb_build_object('promo_code',promo.code,'days',promo.duration_days,'free_access_until',new_until),
    'promo:'||promo.id::text||':'||uid::text);
  return jsonb_build_object('ok',true,'code',promo.code,'days',promo.duration_days,'free_access_until',new_until);
end;
$$;

create or replace function public.ne_owner_grant_free(p_user_id uuid,p_days integer,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  e public.norsk_eventyr_entitlements%rowtype;
  paid_end timestamptz;
  base_at timestamptz;
  new_until timestamptz;
  clean_note text := nullif(left(trim(coalesce(p_note,'')),300),'');
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if p_user_id is null or p_user_id=auth.uid() or p_days is null or p_days not between 1 and 3650 then raise exception 'BAD_GRANT'; end if;
  select * into e from public.norsk_eventyr_entitlements where user_id=p_user_id for update;
  if e.user_id is null then raise exception 'USER_NOT_FOUND'; end if;
  select current_period_end into paid_end from public.norsk_eventyr_subscriptions
   where user_id=p_user_id and status in ('active','trialing') and current_period_end>now();
  base_at := greatest(now(),e.trial_ends_at,coalesce(e.free_access_until,now()),coalesce(paid_end,now()));
  new_until := base_at+make_interval(days=>p_days);
  update public.norsk_eventyr_entitlements set free_access_until=new_until,updated_at=now() where user_id=p_user_id;
  insert into public.norsk_eventyr_access_grants(user_id,grant_type,days,starts_at,ends_at,note,created_by)
   values(p_user_id,'owner_free',p_days,base_at,new_until,clean_note,auth.uid());
  perform public.ne_lifecycle_record(p_user_id,'owner_free_grant',now(),'owner',
    jsonb_build_object('days',p_days,'free_access_until',new_until,'note',clean_note),null);
  return jsonb_build_object('ok',true,'free_access_until',new_until,'days',p_days);
end;
$$;

create or replace function public.ne_owner_confirm_manual_payment(
  p_user_id uuid,p_amount_nok numeric,p_days integer default 30,p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  e public.norsk_eventyr_entitlements%rowtype;
  s public.norsk_eventyr_subscriptions%rowtype;
  period_start timestamptz;
  period_end timestamptz;
  payment_id uuid := gen_random_uuid();
  clean_note text := nullif(left(trim(coalesce(p_note,'')),300),'');
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if p_user_id is null or p_user_id=auth.uid() or p_days is null or p_days not between 1 and 3650
     or p_amount_nok is null or p_amount_nok<0 or p_amount_nok>100000 then raise exception 'BAD_PAYMENT'; end if;
  select * into e from public.norsk_eventyr_entitlements where user_id=p_user_id for update;
  if e.user_id is null then raise exception 'USER_NOT_FOUND'; end if;
  select * into s from public.norsk_eventyr_subscriptions where user_id=p_user_id for update;

  period_start := greatest(now(),e.trial_ends_at,coalesce(e.free_access_until,now()),
                    coalesce(case when s.status in ('active','trialing') then s.current_period_end end,now()));
  period_end := period_start+make_interval(days=>p_days);

  insert into public.norsk_eventyr_payments(
    id,user_id,provider,provider_event_id,provider_payment_id,status,currency,
    amount_nok,fee_nok,refunded_nok,period_start,period_end,paid_at,failure_message
  ) values (
    payment_id,p_user_id,'manual','manual:'||payment_id::text,'manual:'||payment_id::text,'paid','NOK',
    p_amount_nok,0,0,period_start,period_end,now(),clean_note
  );

  insert into public.norsk_eventyr_subscriptions(
    user_id,provider,status,plan_code,amount_nok,current_period_start,current_period_end,cancel_at_period_end,canceled_at,updated_at
  ) values (
    p_user_id,'manual','active','manual_monthly',p_amount_nok,period_start,period_end,true,null,now()
  )
  on conflict(user_id) do update set
    provider='manual',status='active',plan_code='manual_monthly',amount_nok=excluded.amount_nok,
    current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
    cancel_at_period_end=true,canceled_at=null,updated_at=now();

  perform public.ne_lifecycle_record(p_user_id,'manual_payment_confirmed',now(),'owner',
    jsonb_build_object('payment_id',payment_id,'amount_nok',p_amount_nok,'days',p_days,
      'period_start',period_start,'period_end',period_end,'note',clean_note),null);
  return jsonb_build_object('ok',true,'payment_id',payment_id,'period_start',period_start,'period_end',period_end);
end;
$$;

create or replace function public.ne_owner_promo_create(
  p_code text,p_days integer,p_max_redemptions integer default 1,p_valid_until timestamptz default null,p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 normalized text := upper(trim(coalesce(p_code,'')));
 new_id uuid;
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 if normalized !~ '^[A-Z0-9_-]{4,32}$' or p_days not between 1 and 3650
    or p_max_redemptions not between 1 and 100000 or (p_valid_until is not null and p_valid_until<=now()) then raise exception 'BAD_PROMO'; end if;
 insert into public.norsk_eventyr_promo_codes(code,duration_days,max_redemptions,valid_until,note,created_by)
 values(normalized,p_days,p_max_redemptions,p_valid_until,nullif(left(trim(coalesce(p_note,'')),300),''),auth.uid())
 returning id into new_id;
 return jsonb_build_object('ok',true,'id',new_id,'code',normalized);
exception when unique_violation then raise exception 'PROMO_EXISTS';
end;
$$;

create or replace function public.ne_owner_promo_set_active(p_promo_id uuid,p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 if p_promo_id is null or p_active is null then raise exception 'BAD_PROMO'; end if;
 update public.norsk_eventyr_promo_codes set active=p_active,updated_at=now() where id=p_promo_id;
 if not found then raise exception 'PROMO_NOT_FOUND'; end if;
 return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.ne_owner_promo_list()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',p.id,'code',p.code,'duration_days',p.duration_days,'max_redemptions',p.max_redemptions,
     'redemption_count',p.redemption_count,'valid_from',p.valid_from,'valid_until',p.valid_until,
     'active',p.active,'note',p.note,'created_at',p.created_at
   ) order by p.created_at desc)
   from public.norsk_eventyr_promo_codes p
 ),'[]'::jsonb);
end;
$$;

create or replace function public.ne_device_authorize(p_device_id text,p_device_name text default 'Устройство')
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 uid uuid := auth.uid();
 clean_id text := trim(coalesce(p_device_id,''));
 clean_name text := left(coalesce(nullif(trim(p_device_name),''),'Устройство'),120);
 active_devices integer := 0;
 other_recent integer := 0;
 existing public.norsk_eventyr_devices%rowtype;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'LOGIN_REQUIRED'; end if;
 if public.ne_access_owner() then return jsonb_build_object('allowed',true,'owner',true,'active_devices',0,'max_devices',2); end if;
 if clean_id !~ '^[A-Za-z0-9_-]{16,80}$' then return jsonb_build_object('allowed',false,'reason','DEVICE_REQUIRED','max_devices',2); end if;

 select * into existing from public.norsk_eventyr_devices where user_id=uid and device_id=clean_id for update;
 select count(*) into active_devices from public.norsk_eventyr_devices where user_id=uid and revoked_at is null;

 if existing.user_id is null or existing.revoked_at is not null then
   if active_devices>=2 then return jsonb_build_object('allowed',false,'reason','DEVICE_LIMIT','active_devices',active_devices,'max_devices',2); end if;
   insert into public.norsk_eventyr_devices(user_id,device_id,device_name,first_seen_at,last_seen_at,revoked_at)
   values(uid,clean_id,clean_name,now(),now(),null)
   on conflict(user_id,device_id) do update set device_name=excluded.device_name,last_seen_at=now(),revoked_at=null;
   active_devices := active_devices+1;
 else
   update public.norsk_eventyr_devices set device_name=clean_name,last_seen_at=now() where user_id=uid and device_id=clean_id;
 end if;

 select count(*) into other_recent
 from public.norsk_eventyr_devices
 where user_id=uid and revoked_at is null and device_id<>clean_id and last_seen_at>now()-interval '3 minutes';
 if other_recent>0 then
   return jsonb_build_object('allowed',false,'reason','CONCURRENT_DEVICE','active_devices',active_devices,'max_devices',2,'retry_seconds',180);
 end if;
 return jsonb_build_object('allowed',true,'active_devices',active_devices,'max_devices',2);
end;
$$;

create or replace function public.ne_owner_devices_reset(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare changed integer;
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 if p_user_id is null or p_user_id=auth.uid() then raise exception 'BAD_USER'; end if;
 update public.norsk_eventyr_devices set revoked_at=now() where user_id=p_user_id and revoked_at is null;
 get diagnostics changed=row_count;
 perform public.ne_lifecycle_record(p_user_id,'devices_reset',now(),'owner',jsonb_build_object('devices',changed),null);
 return jsonb_build_object('ok',true,'revoked_devices',changed);
end;
$$;

create or replace function public.ne_owner_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare profile jsonb; timeline jsonb; payments jsonb; grants jsonb; devices jsonb;
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if p_user_id is null then raise exception 'BAD_USER'; end if;
  if not public.ne_is_norsk_eventyr_user(p_user_id) then raise exception 'USER_NOT_FOUND'; end if;

  select jsonb_build_object(
    'user_id',u.id,'email',u.email,'registered_at',u.created_at,'email_confirmed_at',u.email_confirmed_at,
    'display_name',coalesce(a.display_name,''),'access_status',coalesce(a.status,'unrequested'),
    'requested_at',a.requested_at,'decided_at',a.decided_at,
    'trial_started_at',e.trial_started_at,'trial_ends_at',e.trial_ends_at,
    'free_access_until',e.free_access_until,'ready_bonus_granted_at',e.ready_bonus_granted_at,
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
    'cancel_at_period_end',coalesce(s.cancel_at_period_end,false),'canceled_at',s.canceled_at,
    'device_count',(select count(*) from public.norsk_eventyr_devices d where d.user_id=u.id and d.revoked_at is null)
  ) into profile
  from auth.users u
  left join public.norsk_eventyr_entitlements e on e.user_id=u.id
  left join public.norsk_eventyr_access a on a.user_id=u.id
  left join public.norsk_eventyr_installs i on i.user_id=u.id
  left join public.norsk_eventyr_subscriptions s on s.user_id=u.id
  where u.id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'event_type',x.event_type,'occurred_at',x.occurred_at,'source',x.source,'metadata',x.metadata
  ) order by x.occurred_at desc,x.id desc),'[]'::jsonb) into timeline
  from public.norsk_eventyr_lifecycle_events x where x.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'status',p.status,'amount_nok',p.amount_nok,'fee_nok',p.fee_nok,
    'refunded_nok',p.refunded_nok,'period_start',p.period_start,'period_end',p.period_end,
    'paid_at',p.paid_at,'created_at',p.created_at,'provider',p.provider,
    'failure_code',p.failure_code,'failure_message',p.failure_message
  ) order by p.created_at desc,p.id desc),'[]'::jsonb) into payments
  from public.norsk_eventyr_payments p where p.user_id=p_user_id;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc),'[]'::jsonb) into grants
  from public.norsk_eventyr_access_grants g where g.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'device_id',d.device_id,'device_name',d.device_name,'first_seen_at',d.first_seen_at,
    'last_seen_at',d.last_seen_at,'revoked_at',d.revoked_at
  ) order by d.last_seen_at desc),'[]'::jsonb) into devices
  from public.norsk_eventyr_devices d where d.user_id=p_user_id;

  return jsonb_build_object('profile',profile,'timeline',timeline,'payments',payments,'grants',grants,'devices',devices);
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
      'free_access_until',e.free_access_until,'ready_bonus_granted_at',e.ready_bonus_granted_at,
      'referral_bonus_granted_at',e.referral_bonus_granted_at,'terms_accepted_at',e.terms_accepted_at,
      'first_installed_at',i.first_installed_at,'last_seen_installed_at',i.last_seen_installed_at,
      'install_platform',i.platform,'install_source',i.source,'activity_days_count',coalesce(e.activity_days_count,0),
      'purchase_interest_at',e.purchase_interest_at,'purchase_interest_price_nok',e.purchase_interest_price_nok,
      'first_paid_at',e.first_paid_at,
      'acquisition_source',case when e.referred_by is not null then 'referral' else coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct') end,
      'acquisition_campaign',left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_campaign','')),80),
      'subscription_status',coalesce(s.status,'inactive'),'plan_code',s.plan_code,
      'subscription_amount_nok',s.amount_nok,'paid_until',s.current_period_end,
      'next_payment_at',case when s.status='active' and not s.cancel_at_period_end then s.current_period_end else null end,
      'cancel_at_period_end',coalesce(s.cancel_at_period_end,false),
      'device_count',(select count(*) from public.norsk_eventyr_devices d where d.user_id=u.id and d.revoked_at is null),
      'last_payment_status',lp.status,'last_payment_at',coalesce(lp.paid_at,lp.created_at),'last_payment_amount_nok',lp.amount_nok
    ) order by coalesce(lp.paid_at,lp.created_at,e.purchase_interest_at,i.first_installed_at,e.trial_started_at,u.created_at) desc)
    from auth.users u
    left join public.norsk_eventyr_entitlements e on e.user_id=u.id
    left join public.norsk_eventyr_access a on a.user_id=u.id
    left join public.norsk_eventyr_installs i on i.user_id=u.id
    left join public.norsk_eventyr_subscriptions s on s.user_id=u.id
    left join lateral (
      select p.status,p.paid_at,p.created_at,p.amount_nok from public.norsk_eventyr_payments p
      where p.user_id=u.id order by p.created_at desc,p.id desc limit 1
    ) lp on true
    where public.ne_is_norsk_eventyr_user(u.id)
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
  'format','norsk-eventyr-backup-v4',
  'created_at',now(),
  'users',coalesce((
    select jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at,'email_confirmed_at',u.email_confirmed_at)
    order by u.created_at) from auth.users u where public.ne_is_norsk_eventyr_user(u.id)
  ),'[]'::jsonb),
  'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.norsk_eventyr_entitlements e),'[]'::jsonb),
  'access',coalesce((select jsonb_agg(to_jsonb(a) order by a.requested_at) from public.norsk_eventyr_access a),'[]'::jsonb),
  'access_grants',coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at) from public.norsk_eventyr_access_grants g),'[]'::jsonb),
  'promo_codes',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.norsk_eventyr_promo_codes p),'[]'::jsonb),
  'promo_redemptions',coalesce((select jsonb_agg(to_jsonb(r) order by r.redeemed_at) from public.norsk_eventyr_promo_redemptions r),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(to_jsonb(d) order by d.first_seen_at) from public.norsk_eventyr_devices d),'[]'::jsonb),
  'subscriptions',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.norsk_eventyr_subscriptions s),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.norsk_eventyr_payments p),'[]'::jsonb),
  'lifecycle_events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at) from public.norsk_eventyr_lifecycle_events e),'[]'::jsonb)
 );
end;
$$;

revoke all on function public.ne_access_status(),public.ne_purchase_interest(integer),
 public.ne_promo_redeem(text),public.ne_owner_grant_free(uuid,integer,text),
 public.ne_owner_confirm_manual_payment(uuid,numeric,integer,text),
 public.ne_owner_promo_create(text,integer,integer,timestamptz,text),
 public.ne_owner_promo_set_active(uuid,boolean),public.ne_owner_promo_list(),
 public.ne_device_authorize(text,text),public.ne_owner_devices_reset(uuid),
 public.ne_owner_user_detail(uuid),public.ne_access_list(),public.ne_owner_backup()
 from public,anon,authenticated;

grant execute on function public.ne_access_status(),public.ne_purchase_interest(integer),
 public.ne_promo_redeem(text),public.ne_device_authorize(text,text)
 to authenticated;

grant execute on function public.ne_owner_grant_free(uuid,integer,text),
 public.ne_owner_confirm_manual_payment(uuid,numeric,integer,text),
 public.ne_owner_promo_create(text,integer,integer,timestamptz,text),
 public.ne_owner_promo_set_active(uuid,boolean),public.ne_owner_promo_list(),
 public.ne_owner_devices_reset(uuid),public.ne_owner_user_detail(uuid),
 public.ne_access_list(),public.ne_owner_backup()
 to authenticated;

commit;
