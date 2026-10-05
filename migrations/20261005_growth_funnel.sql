-- Norsk Eventyr 7.4.0: privacy-minimized growth funnel and acquisition attribution.
-- Phase 1 is backward compatible with older clients: privacy v1, v2 and v3 are accepted during transition.
-- Strict privacy v3 enforcement remains deferred until active older clients have upgraded.

alter table public.norsk_eventyr_entitlements
  add column if not exists activity_days_count integer not null default 0,
  add column if not exists last_activity_date date,
  add column if not exists purchase_interest_at timestamptz,
  add column if not exists purchase_interest_last_at timestamptz,
  add column if not exists purchase_interest_price_nok integer,
  add column if not exists first_paid_at timestamptz;

alter table public.norsk_eventyr_entitlements
  drop constraint if exists ne_entitlements_activity_days_nonnegative;
alter table public.norsk_eventyr_entitlements
  add constraint ne_entitlements_activity_days_nonnegative check (activity_days_count >= 0);

alter table public.norsk_eventyr_entitlements
  drop constraint if exists ne_entitlements_interest_price_positive;
alter table public.norsk_eventyr_entitlements
  add constraint ne_entitlements_interest_price_positive
  check (purchase_interest_price_nok is null or purchase_interest_price_nok between 1 and 100000);

create table if not exists public.norsk_eventyr_growth_daily (
  day date primary key default current_date,
  first_visits bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint ne_growth_daily_first_visits_nonnegative check (first_visits >= 0)
);
alter table public.norsk_eventyr_growth_daily enable row level security;
revoke all on table public.norsk_eventyr_growth_daily from anon, authenticated;

-- Scope owner analytics to Norsk Eventyr users only. The Supabase project also hosts unrelated app data.
create or replace function public.ne_is_norsk_eventyr_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from auth.users u
    where u.id=p_user_id
      and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'
      and (
        coalesce(u.raw_user_meta_data,'{}'::jsonb) ? 'ne_utm_source'
        or coalesce(u.raw_user_meta_data,'{}'::jsonb) ? 'ne_referral_code'
        or exists(select 1 from public.norsk_eventyr_entitlements e where e.user_id=u.id)
        or exists(select 1 from public.norsk_eventyr_access a where a.user_id=u.id)
        or exists(select 1 from public.norsk_eventyr_installs i where i.user_id=u.id)
        or exists(select 1 from public.norsk_eventyr_feedback f where f.user_id=u.id)
      )
  );
$$;
revoke all on function public.ne_is_norsk_eventyr_user(uuid) from public,anon,authenticated;

create or replace function public.ne_growth_first_visit()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  total bigint;
  visit_day date := (now() at time zone 'Europe/Oslo')::date;
begin
  insert into public.norsk_eventyr_growth_daily(day,first_visits,updated_at)
  values(visit_day,1,now())
  on conflict(day) do update
    set first_visits=public.norsk_eventyr_growth_daily.first_visits+1,
        updated_at=now()
  returning first_visits into total;
  return jsonb_build_object('ok',true,'counted',true,'day',visit_day,'daily_total',total);
end;
$$;
revoke all on function public.ne_growth_first_visit() from public;
grant execute on function public.ne_growth_first_visit() to anon,authenticated;

create or replace function public.ne_growth_activity()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  changed boolean := false;
  days integer := 0;
  activity_day date := (now() at time zone 'Europe/Oslo')::date;
begin
  if uid is null or not exists(
    select 1 from auth.users where id=uid and email_confirmed_at is not null
  ) then raise exception 'LOGIN_REQUIRED'; end if;

  update public.norsk_eventyr_entitlements
  set activity_days_count=activity_days_count+1,
      last_activity_date=activity_day,
      updated_at=now()
  where user_id=uid
    and last_activity_date is distinct from activity_day
  returning true,activity_days_count into changed,days;

  if not found then
    select activity_days_count into days
    from public.norsk_eventyr_entitlements
    where user_id=uid;
  end if;

  return jsonb_build_object('ok',true,'counted',coalesce(changed,false),'activity_days_count',coalesce(days,0));
end;
$$;
revoke all on function public.ne_growth_activity() from public,anon;
grant execute on function public.ne_growth_activity() to authenticated;

create or replace function public.ne_purchase_interest(p_price_nok integer default 99)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists(
    select 1 from auth.users where id=uid and email_confirmed_at is not null
  ) then raise exception 'LOGIN_REQUIRED'; end if;
  if p_price_nok is null or p_price_nok < 1 or p_price_nok > 100000 then
    raise exception 'BAD_PRICE';
  end if;

  update public.norsk_eventyr_entitlements
  set purchase_interest_at=coalesce(purchase_interest_at,now()),
      purchase_interest_last_at=now(),
      purchase_interest_price_nok=p_price_nok,
      updated_at=now()
  where user_id=uid;

  if not found then raise exception 'ENTITLEMENT_REQUIRED'; end if;
  return jsonb_build_object('ok',true,'price_nok',p_price_nok);
end;
$$;
revoke all on function public.ne_purchase_interest(integer) from public,anon;
grant execute on function public.ne_purchase_interest(integer) to authenticated;

create or replace function public.ne_owner_growth_funnel()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stages jsonb;
  sources jsonb;
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;

  select jsonb_build_object(
    'first_visits',coalesce((select sum(first_visits) from public.norsk_eventyr_growth_daily),0),
    'first_visits_7d',coalesce((select sum(first_visits) from public.norsk_eventyr_growth_daily where day>=(now() at time zone 'Europe/Oslo')::date-6),0),
    'registered',(select count(*) from auth.users u where public.ne_is_norsk_eventyr_user(u.id)),
    'confirmed',(select count(*) from auth.users u where u.email_confirmed_at is not null and public.ne_is_norsk_eventyr_user(u.id)),
    'trial_started',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.trial_started_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'installed',(select count(*) from public.norsk_eventyr_installs i join auth.users u on u.id=i.user_id where lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'active_3_days',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.activity_days_count>=3 and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'trial_finished',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.trial_ends_at<=now() and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'purchase_interest',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.purchase_interest_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com'),
    'paid',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.first_paid_at is not null and lower(coalesce(u.email,''))<>'mukomell72@gmail.com')
  ) into stages;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source',q.source,
    'registered',q.registered,
    'trial_started',q.trial_started,
    'active_3_days',q.active_3_days,
    'purchase_interest',q.purchase_interest,
    'paid',q.paid
  ) order by q.registered desc,q.source),'[]'::jsonb)
  into sources
  from (
    select
      case
        when e.referred_by is not null then 'referral'
        else coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct')
      end as source,
      count(*) as registered,
      count(*) filter(where e.trial_started_at is not null) as trial_started,
      count(*) filter(where e.activity_days_count>=3) as active_3_days,
      count(*) filter(where e.purchase_interest_at is not null) as purchase_interest,
      count(*) filter(where e.first_paid_at is not null) as paid
    from auth.users u
    left join public.norsk_eventyr_entitlements e on e.user_id=u.id
    where public.ne_is_norsk_eventyr_user(u.id)
    group by 1
  ) q;

  return jsonb_build_object('stages',stages,'sources',sources);
end;
$$;
revoke all on function public.ne_owner_growth_funnel() from public,anon;
grant execute on function public.ne_owner_growth_funnel() to authenticated;

create or replace function public.ne_access_list()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',u.id,
      'email',u.email,
      'registered_at',u.created_at,
      'email_confirmed_at',u.email_confirmed_at,
      'display_name',coalesce(a.display_name,''),
      'status',coalesce(a.status,'unrequested'),
      'requested_at',a.requested_at,
      'decided_at',a.decided_at,
      'trial_started_at',e.trial_started_at,
      'trial_ends_at',e.trial_ends_at,
      'referral_bonus_granted_at',e.referral_bonus_granted_at,
      'terms_accepted_at',e.terms_accepted_at,
      'first_installed_at',i.first_installed_at,
      'last_seen_installed_at',i.last_seen_installed_at,
      'install_platform',i.platform,
      'install_source',i.source,
      'activity_days_count',coalesce(e.activity_days_count,0),
      'purchase_interest_at',e.purchase_interest_at,
      'purchase_interest_price_nok',e.purchase_interest_price_nok,
      'first_paid_at',e.first_paid_at,
      'acquisition_source',case when e.referred_by is not null then 'referral' else coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct') end,
      'acquisition_campaign',left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_campaign','')),80)
    ) order by coalesce(i.first_installed_at,e.trial_started_at,u.created_at) desc)
    from auth.users u
    left join public.norsk_eventyr_entitlements e on e.user_id=u.id
    left join public.norsk_eventyr_access a on a.user_id=u.id
    left join public.norsk_eventyr_installs i on i.user_id=u.id
    where public.ne_is_norsk_eventyr_user(u.id)
  ),'[]'::jsonb);
end;
$$;

-- Transitional privacy handling: older v1/v2 clients and the 7.4.0 v3 client can coexist safely.
create or replace function public.ne_access_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u auth.users;
  req_status text;
  e public.norsk_eventyr_entitlements%rowtype;
  current_terms constant text := '2026-10-05-v1';
  current_privacy constant text := '2026-10-05-v3';
  granted boolean := false;
  effective_status text;
  remaining bigint := 0;
  has_feedback boolean := false;
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;

  if public.ne_access_owner() then
    return jsonb_build_object(
      'status','approved','request_status','approved','access_granted',true,'owner',true,
      'user_id',u.id,'terms_required',false,'feedback_submitted',true,'feedback_prompt_due',false,
      'terms_version',current_terms,'privacy_version',current_privacy,'accepted_privacy_version',current_privacy
    );
  end if;

  select status into req_status from public.norsk_eventyr_access where user_id=u.id;
  select * into e from public.norsk_eventyr_entitlements where user_id=u.id;
  select exists(select 1 from public.norsk_eventyr_feedback where user_id=u.id) into has_feedback;

  if req_status in ('denied','revoked') then
    effective_status := req_status;
  elsif e.user_id is null
     or e.terms_version is distinct from current_terms
     or coalesce(e.privacy_version,'') not in ('2026-10-05-v1','2026-10-05-v2','2026-10-05-v3')
     or e.terms_accepted_at is null
     or e.privacy_accepted_at is null then
    effective_status := 'terms_required';
  elsif req_status='approved' then
    effective_status := 'approved'; granted := true;
  elsif e.trial_ends_at > now() then
    effective_status := 'trial'; granted := true;
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
    'privacy_version',current_privacy,'accepted_privacy_version',e.privacy_version,'trial_started_at',e.trial_started_at,
    'trial_ends_at',e.trial_ends_at,'trial_seconds_remaining',remaining,
    'referral_bonus_granted_at',e.referral_bonus_granted_at,
    'feedback_submitted',has_feedback,
    'feedback_prompt_due',coalesce(e.trial_ends_at<=now(),false) and not has_feedback
  );
end;
$$;

create or replace function public.ne_accept_terms(
  p_terms_version text,
  p_privacy_version text,
  p_referral_code text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u auth.users;
  e public.norsk_eventyr_entitlements%rowtype;
  inviter uuid;
  code text;
  current_terms constant text := '2026-10-05-v1';
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_terms_version is distinct from current_terms
     or coalesce(p_privacy_version,'') not in ('2026-10-05-v1','2026-10-05-v2','2026-10-05-v3') then
    raise exception 'TERMS_VERSION_MISMATCH';
  end if;

  code := nullif(upper(trim(coalesce(p_referral_code,''))),'');
  if code is not null and code !~ '^[A-Z0-9]{12,32}$' then code := null; end if;

  select * into e from public.norsk_eventyr_entitlements where user_id=u.id for update;

  if e.user_id is null then
    if code is not null then
      select user_id into inviter
      from public.norsk_eventyr_entitlements
      where referral_code=code and user_id<>u.id
      limit 1;
    end if;

    insert into public.norsk_eventyr_entitlements(
      user_id,referred_by,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at
    ) values (
      u.id,inviter,current_terms,now(),p_privacy_version,now()
    )
    returning * into e;

    if inviter is not null then
      update public.norsk_eventyr_entitlements
      set trial_ends_at=greatest(trial_ends_at,now())+interval '5 days',
          referral_bonus_granted_at=now(),updated_at=now()
      where user_id=inviter and referral_bonus_granted_at is null;
    end if;
  else
    update public.norsk_eventyr_entitlements
    set terms_version=current_terms,
        terms_accepted_at=case when terms_version is distinct from current_terms or terms_accepted_at is null then now() else terms_accepted_at end,
        privacy_version=p_privacy_version,
        privacy_accepted_at=case when privacy_version is distinct from p_privacy_version or privacy_accepted_at is null then now() else privacy_accepted_at end,
        updated_at=now()
    where user_id=u.id;
  end if;

  return public.ne_access_status();
end;
$$;


create or replace function public.ne_owner_backup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return jsonb_build_object(
  'format','norsk-eventyr-backup-v2',
  'created_at',now(),
  'users',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',u.id,'email',u.email,'created_at',u.created_at,'email_confirmed_at',u.email_confirmed_at,
      'acquisition_source',coalesce(nullif(lower(left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_source','')),40)),''),'direct'),
      'acquisition_campaign',left(btrim(coalesce(u.raw_user_meta_data->>'ne_utm_campaign','')),80)
    ) order by u.created_at)
    from auth.users u
    where public.ne_is_norsk_eventyr_user(u.id)
  ),'[]'::jsonb),
  'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.norsk_eventyr_entitlements e),'[]'::jsonb),
  'access',coalesce((select jsonb_agg(to_jsonb(a) order by a.requested_at) from public.norsk_eventyr_access a),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.norsk_eventyr_feedback f),'[]'::jsonb),
  'installs',coalesce((select jsonb_agg(to_jsonb(i) order by i.first_installed_at) from public.norsk_eventyr_installs i),'[]'::jsonb),
  'growth_daily',coalesce((select jsonb_agg(to_jsonb(g) order by g.day) from public.norsk_eventyr_growth_daily g),'[]'::jsonb),
  'client_errors',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select * from public.norsk_eventyr_client_errors order by created_at desc limit 500) e),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.ne_owner_backup() from public,anon;
grant execute on function public.ne_owner_backup() to authenticated;
