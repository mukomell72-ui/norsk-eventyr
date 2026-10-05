-- DEFERRED: do not apply during the initial 7.4.0 release.
-- Keep transition mode until active 7.3.8 clients have upgraded. Then this script can enforce privacy v3.
-- Norsk Eventyr 7.4.0: finalize privacy notice v3 after the 7.4.0 frontend is live.

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
      'terms_version',current_terms,'privacy_version',current_privacy
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
    'privacy_version',current_privacy,'trial_started_at',e.trial_started_at,
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
  current_privacy constant text := '2026-10-05-v3';
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
          referral_bonus_granted_at=now(),updated_at=now()
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
