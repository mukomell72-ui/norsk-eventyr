'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.NE_PGLITE_PATH||'@electric-sql/pglite');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const migration=read('deferred/NAME_ON_REGISTRATION_2026-10-15.sql');
const access=read('access.js'),handler=read('lib/access-handler.js'),html=read('index.html'),sw=read('sw.js');
assert(access.includes('id="accessRegisterName"'),'New registration name field missing');
assert(access.includes('update_profile_name'),'Existing users cannot update name');
assert(handler.includes('ne_display_name:displayName'),'Sign-up must send name to Auth');
assert(handler.includes("ne_owner_profile_names"),'Owner cannot see newly registered names');
assert(handler.includes('ne_profile_self_name'),'Legacy name fallback missing');
assert(html.includes('/access.js?v=8.3.0-lesson9')&&sw.includes('/access.js?v=8.3.0-lesson9'),'New name form must reach PWA users');
assert(sw.includes('norsk-eventyr-v8-3-0-lesson9'),'New SW revision missing');
(async()=>{
 const db=new PGlite();
 const owner='11111111-1111-4111-8111-111111111111',old='22222222-2222-4222-8222-222222222222',newUser='33333333-3333-4333-8333-333333333333';
 await db.exec(`
  create role anon;create role authenticated;create schema auth;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,
    raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable
  as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
  create table public.norsk_eventyr_access(user_id uuid primary key,display_name text not null,status text not null);
  create function public.ne_access_owner() returns boolean language sql stable security definer set search_path=''
    as $$select exists(select 1 from auth.users where id=auth.uid() and email='owner@example.test')$$;
  create function public.ne_is_norsk_eventyr_user(p_user_id uuid) returns boolean language sql stable security definer set search_path=''
    as $$select exists(select 1 from auth.users where id=p_user_id and email<>'owner@example.test')$$;
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
   ('${owner}','owner@example.test',now(),'{}'),
   ('${old}','old@example.test',now(),'{}'),
   ('${newUser}','new@example.test',now(),'{"ne_display_name":"Олена"}');
  insert into public.norsk_eventyr_access values ('${old}','Старое имя','approved');
 `);
 await db.exec(migration);
 const privileges=(await db.query("select has_function_privilege('anon','public.ne_profile_self_name()','execute') a,has_function_privilege('anon','public.ne_owner_profile_names()','execute') b")).rows[0];
 assert.equal(privileges.a,false);assert.equal(privileges.b,false);
 await db.exec("set request.jwt.sub = '"+old+"'");
 assert.equal((await db.query('select public.ne_profile_self_name() as name')).rows[0].name,'Старое имя');
 await assert.rejects(db.query('select public.ne_owner_profile_names()'),/OWNER_REQUIRED/);
 await db.exec("set request.jwt.sub = '"+newUser+"'");
 assert.equal((await db.query('select public.ne_profile_self_name() as name')).rows[0].name,'Олена');
 // A user-editable display name must not become an owner privilege.
 await db.exec("update auth.users set raw_user_meta_data='{\"ne_display_name\":\"Нове ім я\",\"ne_owner\":true}' where id='"+newUser+"'");
 await assert.rejects(db.query('select public.ne_owner_profile_names()'),/OWNER_REQUIRED/);
 await db.exec("set request.jwt.sub = '"+owner+"'");
 const names=(await db.query('select public.ne_owner_profile_names() as names')).rows[0].names;
 assert.equal(names[old],'Старое имя');
 assert.equal(names[newUser],'Нове ім я');
 assert.equal((await db.query("select status from public.norsk_eventyr_access where user_id='"+old+"'")).rows[0].status,'approved');
 assert.equal((await db.query('select count(*)::int as n from public.norsk_eventyr_access')).rows[0].n,1);
 await db.close();
 console.log('PASS registration names: validated registration, legacy accounts unchanged, profile fallback, owner-only names and PWA revision');
})().catch(err=>{console.error(err);process.exitCode=1});
