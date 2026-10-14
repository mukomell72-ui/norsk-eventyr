-- Run only after OWNER_STUDY_ACTIVITY_2026-10-15.sql has been verified.
-- Retain a maximum of 90 calendar days of daily activity measurements.
-- An opted-out user's boolean suppression marker persists until their account
-- is deleted, preventing accidental reclassification as 'inactive'.
create or replace function public.ne_prune_study_activity()
returns void language plpgsql security invoker set search_path = ''
as $$
begin
 delete from public.norsk_eventyr_study_daily
 where study_day < (now() at time zone 'Europe/Oslo')::date - 89;
 delete from public.norsk_eventyr_study_presence
 where tracking_enabled=true
   and last_heartbeat_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.ne_prune_study_activity() from public, anon, authenticated;

-- pg_cron is already installed on Norsk Eventyr's database.
-- One daily job, UTC 03:17 (05:17/04:17 in Oslo depending on DST).
select cron.schedule('norsk-eventyr-study-retention-90d','17 3 * * *',
 'select public.ne_prune_study_activity()');
