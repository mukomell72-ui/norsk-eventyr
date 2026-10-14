-- PREPARED ONLY: run against a verified backup/clone before any production rollout.
-- New study-activity feature, no reads of lesson text or microphone content.
-- All times are server-side timestamps; study day uses Europe/Oslo.
-- Do not deploy frontend/API until this migration has been applied and tested.

create table if not exists public.norsk_eventyr_study_presence (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_heartbeat_at timestamptz not null default now(),
 tracking_enabled boolean not null default true,
 last_active_at timestamptz
);
create table if not exists public.norsk_eventyr_study_daily (
 user_id uuid not null references auth.users(id) on delete cascade,
 study_day date not null,
 active_seconds integer not null default 0 check (active_seconds >= 0 and active_seconds <= 86400),
 first_activity_at timestamptz not null default now(),
 last_activity_at timestamptz not null default now(),
 primary key(user_id,study_day)
);
create index if not exists ne_study_daily_day_idx on public.norsk_eventyr_study_daily (study_day desc);

alter table public.norsk_eventyr_study_presence enable row level security;
alter table public.norsk_eventyr_study_daily enable row level security;
revoke all on public.norsk_eventyr_study_presence from public,anon,authenticated;
revoke all on public.norsk_eventyr_study_daily from public,anon,authenticated;

-- Client never sets user ID, day or timestamps. Only a verified JWT may
-- write its own bounded foreground time. Zero-second ping registers a
-- baseline; subsequent pings are capped by actual server elapsed time.
create or replace function public.ne_study_heartbeat(p_seconds integer default 0)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 uid uuid := auth.uid();
 previous_at timestamptz;
 accepted integer := 0;
 day_local date := (now() at time zone 'Europe/Oslo')::date;
begin
 if uid is null or not public.ne_is_norsk_eventyr_user(uid)
   or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
  raise exception 'LOGIN_REQUIRED';
 end if;
 if p_seconds is null or p_seconds < 0 or p_seconds > 60 then
  raise exception 'BAD_DURATION';
 end if;
 insert into public.norsk_eventyr_study_presence(user_id,last_heartbeat_at)
 values(uid,now()) on conflict(user_id) do nothing;
 select last_heartbeat_at into previous_at
 from public.norsk_eventyr_study_presence where user_id=uid for update;
 accepted := least(p_seconds,30,
   greatest(0,floor(extract(epoch from (now()-previous_at)))::integer));
 update public.norsk_eventyr_study_presence
 set last_heartbeat_at=now(),tracking_enabled=true,
     last_active_at=case when accepted>0 then now() else last_active_at end
 where user_id=uid;
 if accepted>0 then
  insert into public.norsk_eventyr_study_daily
    (user_id,study_day,active_seconds,first_activity_at,last_activity_at)
  values(uid,day_local,accepted,now(),now())
  on conflict(user_id,study_day) do update set
   active_seconds=least(86400,public.norsk_eventyr_study_daily.active_seconds+excluded.active_seconds),
   last_activity_at=now();
 end if;
 return jsonb_build_object('ok',true,'accepted_seconds',accepted);
end;
$$;

-- A single bounded, owner-only aggregate. Users without tracking remain
-- visible, but no historical duration is invented.
create or replace function public.ne_owner_study_activity()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 result jsonb;
 today_local date := (now() at time zone 'Europe/Oslo')::date;
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'user_id',u.id,'email',u.email,'display_name',coalesce(a.display_name,''),
  'registered_at',u.created_at,
  'last_active_at',pr.last_active_at,'last_heartbeat_at',pr.last_heartbeat_at,
  'tracking_opted_out',pr.tracking_enabled=false,
  'legacy_last_activity_date',en.last_activity_date,
  'today_seconds',coalesce(s.today_seconds,0),
  'week_seconds',coalesce(s.week_seconds,0),
  'month_seconds',coalesce(s.month_seconds,0),
  'active_days_30',coalesce(s.active_days_30,0)
 ) order by pr.last_active_at desc nulls last,u.created_at desc),'[]'::jsonb)
 into result
 from auth.users u
 left join public.norsk_eventyr_access a on a.user_id=u.id
 left join public.norsk_eventyr_entitlements en on en.user_id=u.id
 left join public.norsk_eventyr_study_presence pr on pr.user_id=u.id
 left join lateral (
  select
   coalesce(sum(d.active_seconds) filter(where d.study_day=today_local),0) as today_seconds,
   coalesce(sum(d.active_seconds) filter(where d.study_day>=today_local-6),0) as week_seconds,
   coalesce(sum(d.active_seconds),0) as month_seconds,
   count(*) filter(where d.active_seconds>0) as active_days_30
  from public.norsk_eventyr_study_daily d
  where d.user_id=u.id and d.study_day between today_local-29 and today_local
 ) s on true
 where public.ne_is_norsk_eventyr_user(u.id)
   and coalesce(u.raw_app_meta_data->>'ne_owner','false')<>'true';
 return result;
end;
$$;

create or replace function public.ne_owner_study_activity_days(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 result jsonb;
 today_local date := (now() at time zone 'Europe/Oslo')::date;
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 if p_user_id is null or not public.ne_is_norsk_eventyr_user(p_user_id) then
  raise exception 'USER_NOT_FOUND';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'day',d.study_day,'seconds',d.active_seconds,
  'first_activity_at',d.first_activity_at,'last_activity_at',d.last_activity_at
 ) order by d.study_day desc),'[]'::jsonb) into result
 from public.norsk_eventyr_study_daily d
 where d.user_id=p_user_id and d.study_day between today_local-29 and today_local;
 return result;
end;
$$;

-- On opt-out erase the stored daily totals and old activity timestamps,
-- retaining only a boolean preference so the owner never labels an opted-out
-- user as passive merely because legacy activity has aged out.
create or replace function public.ne_study_opt_out()
returns jsonb language plpgsql security definer set search_path = ''
as $
declare uid uuid := auth.uid();
begin
 if uid is null or not public.ne_is_norsk_eventyr_user(uid) then
  raise exception 'LOGIN_REQUIRED';
 end if;
 delete from public.norsk_eventyr_study_daily where user_id=uid;
 insert into public.norsk_eventyr_study_presence(user_id,last_heartbeat_at,tracking_enabled,last_active_at)
 values(uid,now(),false,null)
 on conflict(user_id) do update set last_heartbeat_at=now(),tracking_enabled=false,last_active_at=null;
 return jsonb_build_object('ok',true);
end;
$;

revoke all on function public.ne_study_heartbeat(integer) from public,anon,authenticated;
revoke all on function public.ne_study_opt_out() from public,anon,authenticated;
revoke all on function public.ne_owner_study_activity() from public,anon,authenticated;
revoke all on function public.ne_owner_study_activity_days(uuid) from public,anon,authenticated;
grant execute on function public.ne_study_heartbeat(integer) to authenticated;
grant execute on function public.ne_study_opt_out() to authenticated;
grant execute on function public.ne_owner_study_activity() to authenticated;
grant execute on function public.ne_owner_study_activity_days(uuid) to authenticated;

-- Install daily 90-day retention using the companion cron migration before release.
-- No existing application table is deleted.
