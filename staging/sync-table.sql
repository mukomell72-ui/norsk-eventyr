-- Empty staging database only. Derived from ne_sync_v2 and its regression fixture.
create table public.norsk_eventyr_sync (
  sync_id uuid primary key,
  secret_hash bytea not null check (octet_length(secret_hash) = 32),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);
alter table public.norsk_eventyr_sync enable row level security;
revoke all on public.norsk_eventyr_sync from public, anon, authenticated;
