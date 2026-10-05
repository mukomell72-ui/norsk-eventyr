-- Norsk Eventyr 7.3.7: public ratings, post-trial feedback prompt, install tracking.

create table if not exists public.norsk_eventyr_installs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_installed_at timestamptz not null default now(),
  last_seen_installed_at timestamptz not null default now(),
  platform text not null default '',
  source text not null default 'unknown',
  constraint norsk_eventyr_installs_platform_len check (char_length(platform) <= 80),
  constraint norsk_eventyr_installs_source_len check (char_length(source) <= 32)
);

alter table public.norsk_eventyr_installs enable row level security;
revoke all on table public.norsk_eventyr_installs from anon, authenticated;

create or replace function public.ne_install_seen(p_platform text default '', p_source text default 'unknown')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  platform_value text := left(btrim(coalesce(p_platform,'')),80);
  source_value text := left(btrim(coalesce(p_source,'unknown')),32);
  first_seen timestamptz;
  last_seen timestamptz;
begin
  if uid is null or not exists(
    select 1 from auth.users where id=uid and email_confirmed_at is not null
  ) then raise exception 'LOGIN_REQUIRED'; end if;

  if source_value = '' then source_value := 'unknown'; end if;

  insert into public.norsk_eventyr_installs(user_id,platform,source)
  values(uid,platform_value,source_value)
  on conflict (user_id) do update
  set last_seen_installed_at=now(),
      platform=case when excluded.platform<>'' then excluded.platform else public.norsk_eventyr_installs.platform end,
      source=case when excluded.source<>'unknown' then excluded.source else public.norsk_eventyr_installs.source end
  returning first_installed_at,last_seen_installed_at into first_seen,last_seen;

  return jsonb_build_object('ok',true,'first_installed_at',first_seen,'last_seen_installed_at',last_seen);
end;
$$;

revoke all on function public.ne_install_seen(text,text) from public, anon;
grant execute on function public.ne_install_seen(text,text) to authenticated;

create or replace function public.ne_feedback_public()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  items jsonb;
  total_count bigint;
  average_rating numeric;
begin
  with latest as (
    select distinct on (f.user_id)
      f.user_id,f.rating,f.comment,f.created_at,f.id
    from public.norsk_eventyr_feedback f
    order by f.user_id,f.created_at desc,f.id desc
  )
  select count(*),round(coalesce(avg(rating),0)::numeric,1)
    into total_count,average_rating
  from latest;

  with latest as (
    select distinct on (f.user_id)
      f.user_id,f.rating,f.comment,f.created_at,f.id
    from public.norsk_eventyr_feedback f
    order by f.user_id,f.created_at desc,f.id desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rating',x.rating,
    'comment',x.comment,
    'created_at',x.created_at
  ) order by x.created_at desc,x.id desc),'[]'::jsonb)
  into items
  from (
    select rating,comment,created_at,id
    from latest
    where btrim(coalesce(comment,''))<>''
    order by created_at desc,id desc
    limit 50
  ) x;

  return jsonb_build_object('items',items,'count',total_count,'average',average_rating);
end;
$$;

revoke all on function public.ne_feedback_public() from public;
grant execute on function public.ne_feedback_public() to anon, authenticated;

create or replace function public.ne_feedback_submit(p_rating smallint, p_comment text, p_suggestion text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 uid uuid := auth.uid();
 comment_value text := btrim(coalesce(p_comment,''));
 suggestion_value text := btrim(coalesce(p_suggestion,''));
 inserted_id uuid;
 inserted_at timestamptz;
begin
 if uid is null then raise exception 'LOGIN_REQUIRED'; end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
  raise exception 'LOGIN_REQUIRED';
 end if;
 if not public.ne_access_owner() and not exists(
  select 1 from public.norsk_eventyr_entitlements where user_id=uid
 ) then raise exception 'APPROVAL_REQUIRED'; end if;
 if p_rating is null or p_rating not between 1 and 5
  or char_length(comment_value)>1200 or char_length(suggestion_value)>1200 then
  raise exception 'BAD_FEEDBACK';
 end if;
 insert into public.norsk_eventyr_feedback(user_id,rating,comment,suggestion)
 values(uid,p_rating,comment_value,suggestion_value)
 returning id,created_at into inserted_id,inserted_at;
 return jsonb_build_object('ok',true,'id',inserted_id,'created_at',inserted_at);
end;
$$;

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
  current_privacy constant text := '2026-10-05-v2';
  granted boolean := false;
  effective_status text;
  remaining bigint := 0;
  has_feedback boolean := false;
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
      'terms_required',false,
      'feedback_submitted',true,
      'feedback_prompt_due',false
    );
  end if;

  select status into req_status from public.norsk_eventyr_access where user_id=u.id;
  select * into e from public.norsk_eventyr_entitlements where user_id=u.id;
  select exists(select 1 from public.norsk_eventyr_feedback where user_id=u.id) into has_feedback;

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
  current_privacy constant text := '2026-10-05-v2';
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
      'install_source',i.source
    ) order by coalesce(i.first_installed_at,e.trial_started_at,u.created_at) desc)
    from auth.users u
    left join public.norsk_eventyr_entitlements e on e.user_id=u.id
    left join public.norsk_eventyr_access a on a.user_id=u.id
    left join public.norsk_eventyr_installs i on i.user_id=u.id
    where lower(coalesce(u.email,'')) <> 'mukomell72@gmail.com'
      and (
        e.user_id is not null
        or a.user_id is not null
        or i.user_id is not null
        or exists(select 1 from public.norsk_eventyr_feedback f where f.user_id=u.id)
      )
  ),'[]'::jsonb);
end;
$$;
