-- Norsk Eventyr 7.3.3: five-day trial, one-time referral bonus, and versioned agreement acceptance.
begin;

create table if not exists public.norsk_eventyr_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '5 days'),
  referral_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,24)),
  referred_by uuid references auth.users(id) on delete set null,
  referral_bonus_granted_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  privacy_version text,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norsk_eventyr_no_self_referral check (referred_by is null or referred_by <> user_id)
);

alter table public.norsk_eventyr_entitlements enable row level security;
revoke all on public.norsk_eventyr_entitlements from public, anon, authenticated;

create or replace function public.ne_access_status() returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u auth.users;
  req_status text;
  e public.norsk_eventyr_entitlements%rowtype;
  current_terms constant text := '2026-10-05-v1';
  current_privacy constant text := '2026-10-05-v1';
  granted boolean := false;
  effective_status text;
  remaining bigint := 0;
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;

  if public.ne_access_owner() then
    return jsonb_build_object(
      'status','approved',
      'request_status','approved',
      'access_granted',true,
      'owner',true,
      'user_id',u.id,
      'terms_required',false
    );
  end if;

  select status into req_status from public.norsk_eventyr_access where user_id=u.id;
  select * into e from public.norsk_eventyr_entitlements where user_id=u.id;

  if req_status in ('denied','revoked') then
    effective_status := req_status;
  elsif e.user_id is null
     or e.terms_version is distinct from current_terms
     or e.privacy_version is distinct from current_privacy
     or e.terms_accepted_at is null
     or e.privacy_accepted_at is null then
    effective_status := 'terms_required';
  elsif req_status='approved' then
    effective_status := 'approved';
    granted := true;
  elsif e.trial_ends_at > now() then
    effective_status := 'trial';
    granted := true;
    remaining := greatest(0, floor(extract(epoch from (e.trial_ends_at-now())))::bigint);
  elsif req_status='pending' then
    effective_status := 'pending';
  else
    effective_status := 'expired';
  end if;

  return jsonb_build_object(
    'status',effective_status,
    'request_status',coalesce(req_status,'unrequested'),
    'access_granted',granted,
    'owner',false,
    'user_id',u.id,
    'terms_required',effective_status='terms_required',
    'terms_version',current_terms,
    'privacy_version',current_privacy,
    'trial_started_at',e.trial_started_at,
    'trial_ends_at',e.trial_ends_at,
    'trial_seconds_remaining',remaining,
    'referral_bonus_granted_at',e.referral_bonus_granted_at
  );
end;
$$;

create or replace function public.ne_accept_terms(
  p_terms_version text,
  p_privacy_version text,
  p_referral_code text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u auth.users;
  e public.norsk_eventyr_entitlements%rowtype;
  inviter uuid;
  code text;
  current_terms constant text := '2026-10-05-v1';
  current_privacy constant text := '2026-10-05-v1';
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_terms_version is distinct from current_terms or p_privacy_version is distinct from current_privacy then
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
      u.id,inviter,current_terms,now(),current_privacy,now()
    )
    returning * into e;

    if inviter is not null then
      update public.norsk_eventyr_entitlements
      set trial_ends_at=greatest(trial_ends_at,now())+interval '5 days',
          referral_bonus_granted_at=now(),
          updated_at=now()
      where user_id=inviter and referral_bonus_granted_at is null;
    end if;
  else
    update public.norsk_eventyr_entitlements
    set terms_version=current_terms,
        terms_accepted_at=case when terms_version is distinct from current_terms or terms_accepted_at is null then now() else terms_accepted_at end,
        privacy_version=current_privacy,
        privacy_accepted_at=case when privacy_version is distinct from current_privacy or privacy_accepted_at is null then now() else privacy_accepted_at end,
        updated_at=now()
    where user_id=u.id;
  end if;

  return public.ne_access_status();
end;
$$;

create or replace function public.ne_referral_info() returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u auth.users;
  e public.norsk_eventyr_entitlements%rowtype;
  s jsonb;
begin
  select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;

  s := public.ne_access_status();
  if coalesce((s->>'access_granted')::boolean,false) is not true then
    raise exception 'APPROVAL_REQUIRED';
  end if;

  select * into e from public.norsk_eventyr_entitlements where user_id=u.id;
  if e.user_id is null and public.ne_access_owner() then
    insert into public.norsk_eventyr_entitlements(
      user_id,trial_ends_at,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at
    ) values (
      u.id,now(),'2026-10-05-v1',now(),'2026-10-05-v1',now()
    )
    on conflict(user_id) do nothing;
    select * into e from public.norsk_eventyr_entitlements where user_id=u.id;
  end if;

  if e.user_id is null then raise exception 'TERMS_REQUIRED'; end if;
  return jsonb_build_object(
    'referral_code',e.referral_code,
    'bonus_used',e.referral_bonus_granted_at is not null,
    'bonus_granted_at',e.referral_bonus_granted_at
  );
end;
$$;

create or replace function public.ne_access_list() returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(
      to_jsonb(a) || jsonb_build_object(
        'trial_ends_at',e.trial_ends_at,
        'referral_bonus_granted_at',e.referral_bonus_granted_at,
        'terms_accepted_at',e.terms_accepted_at
      )
      order by a.requested_at desc
    )
    from public.norsk_eventyr_access a
    left join public.norsk_eventyr_entitlements e on e.user_id=a.user_id
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.ne_accept_terms(text,text,text), public.ne_referral_info() from public,anon,authenticated;
grant execute on function public.ne_accept_terms(text,text,text), public.ne_referral_info() to authenticated;

commit;
