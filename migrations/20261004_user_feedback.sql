-- Separate additive feature: user ratings and suggestions. Existing learning progress and access migration are untouched.
begin;

create table public.norsk_eventyr_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 rating smallint not null check (rating between 1 and 5),
 comment text not null default '' check (char_length(comment) <= 1200),
 suggestion text not null default '' check (char_length(suggestion) <= 1200),
 created_at timestamptz not null default now()
);
create index norsk_eventyr_feedback_created_at_idx
 on public.norsk_eventyr_feedback (created_at desc, id desc);
alter table public.norsk_eventyr_feedback enable row level security;
revoke all on public.norsk_eventyr_feedback from public, anon, authenticated;

create function public.ne_feedback_submit(p_rating smallint,p_comment text,p_suggestion text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 uid uuid := auth.uid();
 comment_value text := btrim(coalesce(p_comment,''));
 suggestion_value text := btrim(coalesce(p_suggestion,''));
 inserted_id uuid;
 inserted_at timestamptz;
begin
 if uid is null then raise exception 'LOGIN_REQUIRED'; end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
  raise exception 'LOGIN_REQUIRED';
 end if;
 if not public.ne_access_owner() and not exists(
  select 1 from public.norsk_eventyr_access where user_id=uid and status='approved'
 ) then raise exception 'APPROVAL_REQUIRED'; end if;
 if p_rating is null or p_rating not between 1 and 5
  or char_length(comment_value)>1200 or char_length(suggestion_value)>1200 then
  raise exception 'BAD_FEEDBACK';
 end if;
 insert into public.norsk_eventyr_feedback(user_id,rating,comment,suggestion)
 values(uid,p_rating,comment_value,suggestion_value)
 returning id,created_at into inserted_id,inserted_at;
 return jsonb_build_object('ok',true,'id',inserted_id,'created_at',inserted_at);
end;
$$;

create function public.ne_feedback_list()
returns jsonb
language plpgsql
security definer
set search_path=''
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
  'comment',f.comment,'suggestion',f.suggestion,'created_at',f.created_at
 ) order by f.created_at desc,f.id desc),'[]'::jsonb)
 into items
 from (
  select feedback.id,feedback.user_id,users.email,feedback.rating,
   feedback.comment,feedback.suggestion,feedback.created_at
  from public.norsk_eventyr_feedback as feedback
  join auth.users as users on users.id=feedback.user_id
  order by feedback.created_at desc,feedback.id desc
  limit 100
 ) as f;
 return jsonb_build_object('items',items,'count',total_count,'average',average_rating);
end;
$$;

revoke all on function public.ne_feedback_submit(smallint,text,text),public.ne_feedback_list()
 from public,anon,authenticated;
grant execute on function public.ne_feedback_submit(smallint,text,text),public.ne_feedback_list()
 to authenticated;

commit;
