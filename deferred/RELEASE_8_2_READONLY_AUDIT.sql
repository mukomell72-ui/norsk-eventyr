-- NORSK EVENTYR 8.2 - READ-ONLY RELEASE AUDIT
-- Safe to execute during preparation. No DDL, DML, role changes or client data output.
-- Check EXPECTATIONS below in the CURRENT deployed database, not only source files.
-- Do NOT execute SECURITY_8_2_SYNC_CUTOVER.sql as part of these checks.
-- EXPECT: both new RPCs exist, SECURITY DEFINER, auth-only; RLS, owner index.
select p.proname,p.oid::regprocedure::text as signature,p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig,','),'') as secure_search_path,
  has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  position('auth.uid()' in pg_get_functiondef(p.oid))>0 as identity_check_present,
  position('owner_user_id' in pg_get_functiondef(p.oid))>0 as owner_check_present
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'ne_access_status_v2','ne_ai_quota_check','ne_sync_v2',
  'norsk_eventyr_sync_create','norsk_eventyr_sync_pull',
  'norsk_eventyr_sync_push','norsk_eventyr_sync_delete'
) order by p.proname;
-- EXPECT: table RLS=true, public and authenticated direct SELECT=false.
select c.relname as table_name,c.relrowsecurity as row_level_security,
  has_table_privilege('anon',c.oid,'SELECT') as anonymous_direct_select,
  has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_direct_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname in ('norsk_eventyr_ai_usage','norsk_eventyr_sync')
order by c.relname;
-- EXPECT: an owner_user_id column and ne_sync_owner_idx exist.
select column_name,is_nullable,data_type from information_schema.columns
where table_schema='public' and table_name='norsk_eventyr_sync'
 and column_name in ('owner_user_id','revision','state')
order by column_name;
select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='norsk_eventyr_sync'
order by indexname;
-- Aggregate ONLY; does not reveal IDs, secrets, progress, email or student answers.
-- A zero count is not proof that user progress is absent: local browser data is separate.
select count(*) as cloud_links_total,
  count(*) filter(where owner_user_id is null) as legacy_ownerless_links,
  count(*) filter(where owner_user_id is not null) as account_bound_links
from public.norsk_eventyr_sync;
-- Review rows for owner-specific deletion; do not assume every user has an assigned owner.
select c.conrelid::regclass::text as table_name,pg_get_constraintdef(c.oid) as foreign_key
from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace
  and c.conrelid::regclass::text like 'norsk_eventyr_%'
order by c.conrelid::regclass::text;
-- EXPECT before rollout: legacy RPCs still callable so 8.0.1 clients are not broken.
-- EXPECT after separately approved migration/cutover: legacy RPCs no longer callable by anon or authenticated.
-- Never change security grants based on this output without backup, rehearsal, owner approval.
