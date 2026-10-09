-- DANGEROUS CUTOVER: requires separate explicit owner approval.
-- Preconditions:
-- 1. SECURITY_8_2_SYNC_PREPARE.sql applied and V2 RPC negative tests passed.
-- 2. Every production /api/cloud invocation is confirmed to use ne_sync_v2
--    with the caller's authenticated JWT; current 8.0 clients still work
--    through the new server adapter.
-- 3. DB backup and tested rollback available. No outstanding old deployments.
-- 4. Confirm direct legacy RPC is no longer needed by any supported client.
revoke execute on function public.norsk_eventyr_sync_create(uuid,text,jsonb)
  from public,anon,authenticated;
revoke execute on function public.norsk_eventyr_sync_pull(uuid,text)
  from public,anon,authenticated;
revoke execute on function public.norsk_eventyr_sync_push(uuid,text,jsonb,bigint)
  from public,anon,authenticated;
revoke execute on function public.norsk_eventyr_sync_delete(uuid,text)
  from public,anon,authenticated;

-- Post-cutover verification, run as SQL SELECT:
-- select proname,has_function_privilege('anon',oid,'EXECUTE') anon_allowed,
--        has_function_privilege('authenticated',oid,'EXECUTE') auth_allowed
-- from pg_proc where pronamespace='public'::regnamespace and
-- proname like 'norsk_eventyr_sync_%';
-- Expect all false. ne_sync_v2 must grant ONLY authenticated.
-- Rollback plan: restore prior grants ONLY with owner approval; that temporarily
-- reopens bearer-secret RPC access, therefore prefer restoring the working v2 service.
