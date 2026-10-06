-- Norsk Eventyr 7.3.8: moderation, observability, owner analytics, backup export, indexes.

alter table public.norsk_eventyr_feedback
  add column if not exists is_public boolean not null default true,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

create index if not exists norsk_eventyr_feedback_user_id_idx
  on public.norsk_eventyr_feedback(user_id);
create index if not exists norsk_eventyr_feedback_public_created_idx
  on public.norsk_eventyr_feedback(is_public,created_at desc);
create index if not exists norsk_eventyr_entitlements_referred_by_idx
  on public.norsk_eventyr_entitlements(referred_by);

create table if not exists public.norsk_eventyr_client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default '',
  message text not null default '',
  path text not null default '',
  app_version text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  constraint ne_client_error_code_len check (char_length(code) <= 80),
  constraint ne_client_error_message_len check (char_length(message) <= 500),
  constraint ne_client_error_path_len check (char_length(path) <= 300),
  constraint ne_client_error_version_len check (char_length(app_version) <= 32),
  constraint ne_client_error_ua_len check (char_length(user_agent) <= 250)
);
alter table public.norsk_eventyr_client_errors enable row level security;
revoke all on table public.norsk_eventyr_client_errors from anon, authenticated;
create index if not exists norsk_eventyr_client_errors_created_idx
  on public.norsk_eventyr_client_errors(created_at desc);
create index if not exists norsk_eventyr_client_errors_user_idx
  on public.norsk_eventyr_client_errors(user_id,created_at desc);

create or replace function public.ne_feedback_public()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  items jsonb;
  total_count bigint;
  average_rating numeric;
begin
  with latest as (
    select distinct on (f.user_id)
      f.user_id,f.rating,f.comment,f.created_at,f.id,f.is_public
    from public.norsk_eventyr_feedback f
    order by f.user_id,f.created_at desc,f.id desc
  )
  select count(*),round(coalesce(avg(rating),0)::numeric,1)
    into total_count,average_rating
  from latest;

  with latest as (
    select distinct on (f.user_id)
      f.user_id,f.rating,f.comment,f.created_at,f.id,f.is_public
    from public.norsk_eventyr_feedback f
    order by f.user_id,f.created_at desc,f.id desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rating',x.rating,
    'comment',x.comment,
    'created_at',x.created_at
  ) order by x.created_at desc,x.id desc),'[]'::jsonb)
  into items
  from (
    select rating,comment,created_at,id
    from latest
    where is_public=true and btrim(coalesce(comment,''))<>''
    order by created_at desc,id desc
    limit 100
  ) x;

  return jsonb_build_object('items',items,'count',total_count,'average',average_rating);
end;
$$;
revoke all on function public.ne_feedback_public() from public;
grant execute on function public.ne_feedback_public() to anon,authenticated;

create or replace function public.ne_feedback_list()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 items jsonb;
 total_count bigint;
 average_rating numeric;
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 select count(*),round(coalesce(avg(rating),0)::numeric,1)
 into total_count,average_rating
 from public.norsk_eventyr_feedback;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',f.id,'user_id',f.user_id,'email',f.email,'rating',f.rating,
  'comment',f.comment,'suggestion',f.suggestion,'created_at',f.created_at,
  'is_public',f.is_public,'moderated_at',f.moderated_at
 ) order by f.created_at desc,f.id desc),'[]'::jsonb)
 into items
 from (
  select feedback.id,feedback.user_id,users.email,feedback.rating,
   feedback.comment,feedback.suggestion,feedback.created_at,
   feedback.is_public,feedback.moderated_at
  from public.norsk_eventyr_feedback as feedback
  join auth.users as users on users.id=feedback.user_id
  order by feedback.created_at desc,feedback.id desc
  limit 200
 ) as f;
 return jsonb_build_object('items',items,'count',total_count,'average',average_rating);
end;
$$;

create or replace function public.ne_feedback_moderate(p_feedback_id uuid,p_public boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 update public.norsk_eventyr_feedback
 set is_public=coalesce(p_public,false),
     moderated_at=now(),
     moderated_by=auth.uid()
 where id=p_feedback_id;
 if not found then raise exception 'NOT_FOUND'; end if;
 return jsonb_build_object('ok',true,'id',p_feedback_id,'is_public',coalesce(p_public,false));
end;
$$;
revoke all on function public.ne_feedback_moderate(uuid,boolean) from public,anon;
grant execute on function public.ne_feedback_moderate(uuid,boolean) to authenticated;

create or replace function public.ne_client_error_submit(
 p_code text,p_message text,p_path text,p_app_version text,p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 then raise exception 'LOGIN_REQUIRED'; end if;
 insert into public.norsk_eventyr_client_errors(user_id,code,message,path,app_version,user_agent)
 values(
   uid,
   left(btrim(coalesce(p_code,'')),80),
   left(btrim(coalesce(p_message,'')),500),
   left(btrim(coalesce(p_path,'')),300),
   left(btrim(coalesce(p_app_version,'')),32),
   left(btrim(coalesce(p_user_agent,'')),250)
 );
 return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.ne_client_error_submit(text,text,text,text,text) from public,anon;
grant execute on function public.ne_client_error_submit(text,text,text,text,text) to authenticated;

create or replace function public.ne_owner_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 select jsonb_build_object(
   'registered_users',(select count(*) from auth.users u where (coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'),
   'confirmed_users',(select count(*) from auth.users u where u.email_confirmed_at is not null and (coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'),
   'active_trials',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.trial_ends_at>now() and (coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'),
   'expired_trials',(select count(*) from public.norsk_eventyr_entitlements e join auth.users u on u.id=e.user_id where e.trial_ends_at<=now() and (coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'),
   'installs',(select count(*) from public.norsk_eventyr_installs i join auth.users u on u.id=i.user_id where (coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'),
   'ratings',(select count(distinct user_id) from public.norsk_eventyr_feedback),
   'average_rating',(select round(coalesce(avg(x.rating),0)::numeric,1) from (
       select distinct on (user_id) user_id,rating
       from public.norsk_eventyr_feedback
       order by user_id,created_at desc,id desc
   ) x),
   'public_comments',(select count(*) from public.norsk_eventyr_feedback where is_public=true and btrim(coalesce(comment,''))<>''),
   'hidden_comments',(select count(*) from public.norsk_eventyr_feedback where is_public=false),
   'errors_24h',(select count(*) from public.norsk_eventyr_client_errors where created_at>=now()-interval '24 hours'),
   'registrations_7d',(select count(*) from auth.users where created_at>=now()-interval '7 days' and (coalesce(raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'),
   'installs_7d',(select count(*) from public.norsk_eventyr_installs where first_installed_at>=now()-interval '7 days')
 ) into result;
 return result;
end;
$$;
revoke all on function public.ne_owner_dashboard() from public,anon;
grant execute on function public.ne_owner_dashboard() to authenticated;

create or replace function public.ne_owner_error_list()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',e.id,'email',u.email,'code',e.code,'message',e.message,
     'path',e.path,'app_version',e.app_version,'user_agent',e.user_agent,
     'created_at',e.created_at
   ) order by e.created_at desc)
   from (
     select * from public.norsk_eventyr_client_errors
     order by created_at desc
     limit 100
   ) e
   join auth.users u on u.id=e.user_id
 ),'[]'::jsonb);
end;
$$;
revoke all on function public.ne_owner_error_list() from public,anon;
grant execute on function public.ne_owner_error_list() to authenticated;

create or replace function public.ne_owner_backup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.ne_access_owner() then raise exception 'OWNER_REQUIRED'; end if;
 return jsonb_build_object(
  'format','norsk-eventyr-backup-v1',
  'created_at',now(),
  'users',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',u.id,'email',u.email,'created_at',u.created_at,'email_confirmed_at',u.email_confirmed_at
    ) order by u.created_at)
    from auth.users u
    where (coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner') is distinct from 'true'
  ),'[]'::jsonb),
  'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.norsk_eventyr_entitlements e),'[]'::jsonb),
  'access',coalesce((select jsonb_agg(to_jsonb(a) order by a.requested_at) from public.norsk_eventyr_access a),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.norsk_eventyr_feedback f),'[]'::jsonb),
  'installs',coalesce((select jsonb_agg(to_jsonb(i) order by i.first_installed_at) from public.norsk_eventyr_installs i),'[]'::jsonb),
  'client_errors',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select * from public.norsk_eventyr_client_errors order by created_at desc limit 500) e),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.ne_owner_backup() from public,anon;
grant execute on function public.ne_owner_backup() to authenticated;
