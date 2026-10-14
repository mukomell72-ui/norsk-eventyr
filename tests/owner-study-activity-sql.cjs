// Exercise the staged activity schema on ephemeral PostgreSQL, not production.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.NE_PGLITE_PATH||'@electric-sql/pglite');
const sql=fs.readFileSync(path.join(__dirname,'../deferred/OWNER_STUDY_ACTIVITY_2026-10-15.sql'),'utf8');
const owner='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
(async()=>{
 const db=new PGlite();
 await db.exec(`
  create role anon;create role authenticated;create schema auth;
  create table auth.users(id uuid primary key,email text,display_name text,created_at timestamptz default now(),
   email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable
    as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
  create table public.norsk_eventyr_access(user_id uuid primary key,display_name text);
  create table public.norsk_eventyr_entitlements(user_id uuid primary key,last_activity_date date);
  create function public.ne_access_owner() returns boolean language sql stable security definer set search_path=''
    as $$select exists(select 1 from auth.users u where u.id=auth.uid() and
      coalesce(u.raw_app_meta_data,'{}'::jsonb)->>'ne_owner'='true')$$;
  create function public.ne_is_norsk_eventyr_user(p_user_id uuid)
    returns boolean language sql stable security definer set search_path=''
    as $$select exists(select 1 from auth.users where id=p_user_id)$$;
  insert into auth.users(id,email,display_name,email_confirmed_at,raw_app_meta_data) values
    ('${owner}','owner@example.test','Owner',now(),'{"ne_owner":"true"}'),
    ('${student}','student@example.test','Student',now(),'{}');
  insert into public.norsk_eventyr_access values ('${student}','Student');
  insert into public.norsk_eventyr_entitlements values ('${student}',current_date);
 `);
 await db.exec(sql);
 const grants=(await db.query(`
  select has_function_privilege('anon','public.ne_study_heartbeat(integer)','execute') as anon_heartbeat,
   has_function_privilege('anon','public.ne_owner_study_activity()','execute') as anon_owner,
   has_table_privilege('authenticated','public.norsk_eventyr_study_daily','select') as user_direct_select
 `)).rows[0];
 assert.equal(grants.anon_heartbeat,false);
 assert.equal(grants.anon_owner,false);
 assert.equal(grants.user_direct_select,false);
 await db.exec("set request.jwt.sub = '"+student+"'");
 await assert.rejects(db.query('select public.ne_owner_study_activity()'),/OWNER_REQUIRED/);
 const first=(await db.query('select public.ne_study_heartbeat(0) as result')).rows[0].result;
 assert.equal(first.accepted_seconds,0);
 await db.exec("update public.norsk_eventyr_study_presence set last_heartbeat_at=now()-interval '50 seconds'");
 const next=(await db.query('select public.ne_study_heartbeat(30) as result')).rows[0].result;
 assert.equal(next.accepted_seconds,30);
 const bad=await assert.rejects(db.query('select public.ne_study_heartbeat(300)'),/BAD_DURATION/);
 const daily=(await db.query('select active_seconds from public.norsk_eventyr_study_daily')).rows;
 assert.equal(daily.length,1);assert.equal(daily[0].active_seconds,30);
 await db.exec("set request.jwt.sub = '"+owner+"'");
 const summary=(await db.query('select public.ne_owner_study_activity() as data')).rows[0].data;
 assert.equal(summary.length,1);
 assert.equal(summary[0].today_seconds,30);
 assert.equal(summary[0].email,'student@example.test');
 const breakdown=(await db.query("select public.ne_owner_study_activity_days('"+student+"') as data")).rows[0].data;
 assert.equal(breakdown.length,1);assert.equal(breakdown[0].seconds,30);
 await db.close();
 console.log('PASS SQL: migration compiles, anon denied, ordinary owner queries denied, bounded heartbeat and owner-only summaries');
})().catch(e=>{console.error(e);process.exitCode=1});
