-- Staging-only, lifetime allowance. Failed upstream calls still spend reservations.
create table public.ne_staging_ai_budget (
  singleton boolean primary key check (singleton),
  reserved integer not null check (reserved between 0 and 120)
);
insert into public.ne_staging_ai_budget values (true, 0);
alter table public.ne_staging_ai_budget enable row level security;
revoke all on public.ne_staging_ai_budget from public, anon, authenticated;

create function public.ne_staging_reserve_ai() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  -- Upper bounds for the existing retry and review paths.
  units integer := case new.route
    when '/api/generate' then 3
    when '/api/evaluate' then 2
    when '/api/daily' then 2
    when '/api/transcribe' then 2
    else 1
  end;
begin
  update public.ne_staging_ai_budget set reserved=reserved+units
    where singleton and reserved<=120-units;
  if not found then raise exception 'quota_exceeded' using errcode='P0001'; end if;
  return new;
end;
$$;
revoke all on function public.ne_staging_reserve_ai() from public, anon, authenticated;
-- AFTER avoids charging twice for INSERT ... ON CONFLICT DO UPDATE.
create trigger ne_staging_reserve_ai
after insert or update on public.norsk_eventyr_ai_usage
for each row when (new.bucket='day' and new.route<>'__all_ai__')
execute function public.ne_staging_reserve_ai();

alter table public.norsk_eventyr_sync alter column owner_user_id set not null;

-- The staging server fails closed when only the legacy quota SQL is installed.
create function public.ne_staging_ai_quota_check(p_route text) returns jsonb
language sql security definer set search_path='' as $$
  select public.ne_ai_quota_check(p_route)
$$;
revoke all on function public.ne_staging_ai_quota_check(text) from public, anon;
grant execute on function public.ne_staging_ai_quota_check(text) to authenticated;
revoke all on function public.ne_ai_quota_check(text) from authenticated;
