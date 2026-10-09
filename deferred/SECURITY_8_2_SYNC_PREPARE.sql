-- STAGED ONLY: additive preparation, no change to existing anonymous sync RPCs.
-- Apply only after approval and validation in an isolated copy of the database.
-- The separate *_CUTOVER.sql revokes the old public RPCs AFTER verified server deployment.
alter table public.norsk_eventyr_sync
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
create index if not exists ne_sync_owner_idx
  on public.norsk_eventyr_sync(owner_user_id) where owner_user_id is not null;

create or replace function public.ne_sync_v2(
  p_action text,
  p_sync_id uuid,
  p_secret text,
  p_state jsonb default null,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_hash bytea;
  v_row public.norsk_eventyr_sync%rowtype;
  v_count integer;
begin
  if v_uid is null or not coalesce((public.ne_access_status_v2()->>'access_granted')::boolean,false) then
    return jsonb_build_object('ok',false,'error','ACCESS');
  end if;
  if p_action not in ('create','pull','push','delete') or p_action is null
    or p_sync_id is null or p_secret is null or length(p_secret)<40 or length(p_secret)>200 then
    return jsonb_build_object('ok',false,'error','BAD_INPUT');
  end if;
  if p_action in ('create','push') and (
    p_state is null or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>750000
  ) then return jsonb_build_object('ok',false,'error','BAD_INPUT'); end if;
  if p_action='push' and (p_expected_revision is null or p_expected_revision<0) then
    return jsonb_build_object('ok',false,'error','BAD_INPUT');
  end if;

  v_hash := extensions.digest(pg_catalog.convert_to(p_secret,'UTF8'),'sha256');
  if p_action='create' then
    insert into public.norsk_eventyr_sync(sync_id,secret_hash,state,owner_user_id)
    values(p_sync_id,v_hash,p_state,v_uid)
    on conflict(sync_id) do nothing;
  end if;

  select * into v_row from public.norsk_eventyr_sync
    where sync_id=p_sync_id and secret_hash=v_hash for update;
  if not found then return jsonb_build_object('ok',false,'error','AUTH'); end if;

  -- On the first authenticated use, claim an old bearer-secret link. The claimant
  -- MUST possess its 256-bit recovery secret; ownership cannot be reassigned later.
  if v_row.owner_user_id is null then
    update public.norsk_eventyr_sync set owner_user_id=v_uid where sync_id=p_sync_id;
    v_row.owner_user_id := v_uid;
  end if;
  if v_row.owner_user_id <> v_uid then
    return jsonb_build_object('ok',false,'error','AUTH');
  end if;

  if p_action='create' or p_action='pull' then
    return jsonb_build_object('ok',true,'revision',v_row.revision,
      'updated_at',v_row.updated_at,'state',v_row.state);
  elsif p_action='push' then
    if v_row.revision<>p_expected_revision then
      return jsonb_build_object('ok',false,'error','CONFLICT',
        'revision',v_row.revision,'updated_at',v_row.updated_at,'state',v_row.state);
    end if;
    update public.norsk_eventyr_sync set state=p_state, revision=revision+1,
      updated_at=now() where sync_id=p_sync_id returning * into v_row;
    return jsonb_build_object('ok',true,'revision',v_row.revision,'updated_at',v_row.updated_at);
  elsif p_action='delete' then
    delete from public.norsk_eventyr_sync where sync_id=p_sync_id;
    get diagnostics v_count=row_count;
    return jsonb_build_object('ok',v_count=1);
  end if;
  return jsonb_build_object('ok',false,'error','BAD_ACTION');
end;
$$;
revoke execute on function public.ne_sync_v2(text,uuid,text,jsonb,bigint) from public,anon;
grant execute on function public.ne_sync_v2(text,uuid,text,jsonb,bigint) to authenticated;
