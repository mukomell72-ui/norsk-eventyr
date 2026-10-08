-- Apply once before publishing the access gate. Existing progress tables are untouched.
begin;
create table public.norsk_eventyr_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, display_name text not null check(length(display_name) between 1 and 80),
 status text not null default 'pending' check(status in ('pending','approved','denied','revoked')),
 requested_at timestamptz not null default now(), decided_at timestamptz
);
alter table public.norsk_eventyr_access enable row level security;
revoke all on public.norsk_eventyr_access from public, anon, authenticated;
create function public.ne_access_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and coalesce(raw_app_meta_data,'{}'::jsonb)->>'ne_owner'='true');
$$;
create function public.ne_access_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare u auth.users; s text;
begin
 select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;
 if public.ne_access_owner() then return jsonb_build_object('status','approved','owner',true,'user_id',u.id); end if;
 select status into s from public.norsk_eventyr_access where user_id=u.id;
 return jsonb_build_object('status',coalesce(s,'unrequested'),'owner',false,'user_id',u.id);
end; $$;
create function public.ne_access_request(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u auth.users;
begin
 select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if u.id is null then raise exception 'LOGIN_REQUIRED'; end if;
 if length(trim(p_name)) not between 1 and 80 then raise exception 'BAD_NAME'; end if;
 insert into public.norsk_eventyr_access(user_id,email,display_name) values(u.id,u.email,trim(p_name))
 on conflict(user_id) do update set display_name=excluded.display_name;
 return public.ne_access_status();
end; $$;
create function public.ne_access_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.requested_at desc) from public.norsk_eventyr_access a),'[]'::jsonb);
end; $$;
create function public.ne_access_decide(p_user_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 if p_status not in ('approved','denied','revoked') or p_status is null or p_user_id=auth.uid() then raise exception 'BAD_DECISION'; end if;
 update public.norsk_eventyr_access set status=p_status,decided_at=now() where user_id=p_user_id;
 if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.ne_access_owner(),public.ne_access_status(),public.ne_access_request(text),public.ne_access_list(),public.ne_access_decide(uuid,text) from public,anon,authenticated;
grant execute on function public.ne_access_status(),public.ne_access_request(text),public.ne_access_list(),public.ne_access_decide(uuid,text) to authenticated;
commit;
