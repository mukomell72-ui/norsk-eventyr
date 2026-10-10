-- STAGED ONLY: do not apply to the existing Supabase project until cutover approval.
-- One atomic, cross-instance quota per authenticated learner and AI endpoint.
-- Requires ne_access_status_v2() from the deployed 8.0.1 schema.
create table if not exists public.norsk_eventyr_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  bucket text not null check (bucket in ('hour','day')),
  window_start timestamptz not null,
  used_count integer not null default 0 check (used_count between 0 and 1000000),
  primary key (user_id,route,bucket,window_start)
);
alter table public.norsk_eventyr_ai_usage enable row level security;
revoke all on public.norsk_eventyr_ai_usage from public,anon,authenticated;

create or replace function public.ne_ai_quota_check(p_route text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_hour_limit integer;
  v_day_limit integer;
  v_allowed boolean;
  v_used integer;
  v_item record;
  v_hour timestamptz := date_trunc('hour',now());
  v_day timestamptz := date_trunc('day',now());
begin
  -- Route limits are fixed by the server; the client cannot raise them.
  select limits.hour_limit,limits.day_limit into v_hour_limit,v_day_limit
  from (values
    ('/api/chat',50,150),
    ('/api/evaluate',90,240),
    ('/api/generate',16,40),
    ('/api/speech',35,100),
    ('/api/transcribe',30,80),
    ('/api/pronounce',20,50),
    ('/api/drill',24,60),
    ('/api/daily',8,20),
    ('/api/listening-questions',24,60)
  ) as limits(route,hour_limit,day_limit)
  where limits.route=p_route;
  if v_hour_limit is null or v_uid is null then
    return jsonb_build_object('allowed',false,'reason','DENIED');
  end if;
  select coalesce((public.ne_access_status_v2()->>'access_granted')::boolean,false) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('allowed',false,'reason','DENIED');
  end if;

  -- A subtransaction rolls back *all* counters if any one cap is exceeded.
  begin
    for v_item in
      select * from (values
        (p_route::text,'hour'::text,v_hour,v_hour_limit),
        (p_route::text,'day'::text,v_day,v_day_limit),
        ('__all_ai__'::text,'day'::text,v_day,450)
      ) as checks(route,bucket,window_start,max_calls)
    loop
      v_used := null;
      insert into public.norsk_eventyr_ai_usage as x
        (user_id,route,bucket,window_start,used_count)
      values(v_uid,v_item.route,v_item.bucket,v_item.window_start,1)
      on conflict (user_id,route,bucket,window_start) do update
        set used_count=x.used_count+1
        where x.used_count<v_item.max_calls
      returning used_count into v_used;
      if v_used is null then
        raise exception 'quota_exceeded' using errcode='P0001';
      end if;
    end loop;
  exception when SQLSTATE 'P0001' then
    return jsonb_build_object('allowed',false,'reason','QUOTA');
  end;
  return jsonb_build_object('allowed',true);
end;
$$;
revoke all on function public.ne_ai_quota_check(text) from public,anon;
grant execute on function public.ne_ai_quota_check(text) to authenticated;
-- Retention runbook (separate approved maintenance): delete usage rows older than 35 days.
-- Do not add a public DELETE or admin API for quota counters.
