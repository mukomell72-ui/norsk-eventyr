// Staged SQL is tested only in an ephemeral PGlite database. Never touches Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.NE_PGLITE_PATH||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`
   create role anon;create role authenticated;create schema auth;
   create table auth.users(id uuid primary key);
   insert into auth.users values
     ('11111111-1111-4111-8111-111111111111'),
     ('22222222-2222-4222-8222-222222222222');
   create function auth.uid() returns uuid language sql stable
     as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
   create function public.ne_access_status_v2() returns jsonb language sql stable security definer
     set search_path='' as $$select jsonb_build_object('access_granted',
       auth.uid() = '11111111-1111-4111-8111-111111111111'::uuid
       or auth.uid() = '22222222-2222-4222-8222-222222222222'::uuid)$$;
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'../deferred/SECURITY_8_2_DISTRIBUTED_QUOTA.sql'),'utf8'));
 const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 async function as(id,sql){await db.exec('reset role');await db.query("select set_config('request.jwt.sub',$1,false)",[id]);await db.exec('set role authenticated');return (await db.query(sql)).rows[0]?.result;}
 const req="select public.ne_ai_quota_check('/api/chat') as result";
 assert.equal((await as(user,req)).allowed,true);
 for(let i=1;i<50;i++)assert.equal((await as(user,req)).allowed,true,'hour quota must permit request '+i);
 assert.equal((await as(user,req)).allowed,false,'hour cap must apply across all server instances');
 assert.equal((await as(other,req)).allowed,true,'one learner cannot exhaust another learner\'s quota');
 assert.equal((await as(user,"select public.ne_ai_quota_check('/unknown') as result")).allowed,false);
 const v=(await as(user,"select public.ne_ai_quota_check('/api/evaluate') as result"));
 assert.equal(v.allowed,true,'other endpoint can be used when chat budget exhausted');
 await db.exec('reset role');await db.query("select set_config('request.jwt.sub','',false)");await db.exec('set role anon');
 await assert.rejects(db.query("select public.ne_ai_quota_check('/api/chat')"));
 await assert.rejects(db.query('select * from public.norsk_eventyr_ai_usage'));
 await db.close();
 console.log('PASS distributed quota SQL: hourly cap, isolation, route restrictions, anonymous access and RLS');
})().catch(e=>{console.error(e);process.exit(1)});
