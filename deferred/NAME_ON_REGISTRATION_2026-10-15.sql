-- Deferred profile-name support for Norsk Eventyr.
-- Existing accounts, entitlements, approvals and lesson progress are untouched.
-- Names are non-privileged self-editable Supabase Auth metadata; pre-existing
-- display names in norsk_eventyr_access remain the fallback.
create or replace function public.ne_profile_self_name()
returns text language sql stable security definer set search_path = ''
as $name$
 select coalesce(
   nullif(left(btrim(coalesce(u.raw_user_meta_data->>'ne_display_name','')),80),''),
   nullif(left(btrim(coalesce(a.display_name,'')),80),''),
   ''
 )
 from auth.users u
 left join public.norsk_eventyr_access a on a.user_id=u.id
 where u.id=auth.uid() and u.email_confirmed_at is not null
   and (public.ne_is_norsk_eventyr_user(u.id) or public.ne_access_owner())
$name$;

create or replace function public.ne_owner_profile_names()
returns jsonb language plpgsql stable security definer set search_path = ''
as $names$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return coalesce((
  select jsonb_object_agg(u.id::text, coalesce(
    nullif(left(btrim(coalesce(u.raw_user_meta_data->>'ne_display_name','')),80),''),
    nullif(left(btrim(coalesce(a.display_name,'')),80),''),
    ''
  ))
  from auth.users u
  left join public.norsk_eventyr_access a on a.user_id=u.id
  where public.ne_is_norsk_eventyr_user(u.id)
 ),'{}'::jsonb);
end;
$names$;

revoke all on function public.ne_profile_self_name() from public,anon,authenticated;
revoke all on function public.ne_owner_profile_names() from public,anon,authenticated;
grant execute on function public.ne_profile_self_name() to authenticated;
grant execute on function public.ne_owner_profile_names() to authenticated;
