// Isolated sync-migration regression; uses a mock digest function (NOT a crypto test).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.NE_PGLITE_PATH||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`
  create role anon;create role authenticated;
  create schema auth;create schema extensions;
  create table auth.users(id uuid primary key);
  insert into auth.users values
   ('11111111-1111-4111-8111-111111111111'),
   ('22222222-2222-4222-8222-222222222222');
  create function auth.uid() returns uuid language sql stable
   as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
  create function extensions.digest(data bytea,algorithm text) returns bytea
   language sql immutable as $$select data$$;
  create function public.ne_access_status_v2() returns jsonb language sql stable security definer
   set search_path='' as $$select jsonb_build_object('access_granted',
    auth.uid() is not null and coalesce(current_setting('test.granted',true),'true')<>'false')$$;
  create table public.norsk_eventyr_sync(
   sync_id uuid primary key,secret_hash bytea not null,state jsonb not null default '{}'::jsonb,
   revision bigint not null default 1,created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
  );
  alter table public.norsk_eventyr_sync enable row level security;
  revoke all on public.norsk_eventyr_sync from anon,authenticated;
 `);
 const file=path.join(__dirname,'../deferred/SECURITY_8_2_SYNC_PREPARE.sql');
 await db.exec(fs.readFileSync(file,'utf8'));
 const u='11111111-1111-4111-8111-111111111111',v='22222222-2222-4222-8222-222222222222';
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',legacyId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const secret='b'.repeat(45),legacySecret='c'.repeat(45);
 async function as(uid,sql){
   await db.exec('reset role');
   await db.query("select set_config('request.jwt.sub',$1,false)",[uid]);
   await db.exec('set role authenticated');
   return (await db.query(sql)).rows[0]?.result;
 }
 const rpc=(action,identity=id,code=secret,more='')=>`select public.ne_sync_v2('${action}','${identity}','${code}',${more||'null::jsonb,null::bigint'}) as result`;
 const created=await as(u,rpc('create',id,secret,`'{"xp":7}'::jsonb,null::bigint`));
 assert.equal(created.ok,true);assert.equal(created.state.xp,7);assert.equal(created.revision,1);
 assert.equal((await as(v,rpc('pull'))).error,'AUTH','another account must not read progress even with the old recovery secret');
 assert.equal((await as(u,rpc('pull'))).state.xp,7);
 assert.equal((await as(u,rpc('push',id,secret,`'{"xp":8}'::jsonb,0::bigint`))).error,'CONFLICT');
 assert.equal((await as(u,rpc('push',id,secret,`'{"xp":8}'::jsonb,1::bigint`))).revision,2);
 assert.equal((await as(u,rpc('pull'))).state.xp,8);

 // Existing ownerless row can be claimed once by a logged-in holder of its secret.
 await db.exec('reset role');
 await db.query('insert into public.norsk_eventyr_sync(sync_id,secret_hash,state) values($1,convert_to($2,\'UTF8\'),$3::jsonb)',[legacyId,legacySecret,'{"xp":25}']);
 assert.equal((await as(v,rpc('pull',legacyId,legacySecret))).state.xp,25);
 assert.equal((await as(u,rpc('pull',legacyId,legacySecret))).error,'AUTH');
 assert.equal((await as(v,rpc('pull',legacyId,'d'.repeat(45)))).error,'AUTH','wrong old cloud secret must never grant access');
 // Revoking app access must immediately stop subsequent cloud operations.
 await db.exec('reset role');
 await db.query("select set_config('test.granted','false',false)");
 assert.equal((await as(v,rpc('pull',legacyId,legacySecret))).error,'ACCESS','revoked user must not read cloud progress');
 assert.equal((await as(v,rpc('push',legacyId,legacySecret,`'{"xp":999}'::jsonb,1::bigint`))).error,'ACCESS','revoked user must not write progress');
 await db.exec('reset role');
 await db.query("select set_config('test.granted','true',false)");
 // Deletion must be owner-only and must not touch another learner's record.
 assert.equal((await as(u,rpc('delete',legacyId,legacySecret))).error,'AUTH');
 assert.equal((await as(v,rpc('delete',legacyId,legacySecret))).ok,true);
 assert.equal((await as(v,rpc('pull',legacyId,legacySecret))).error,'AUTH','deleted cloud copy cannot be restored via the old code');

 await db.exec('reset role');await db.query("select set_config('request.jwt.sub','',false)");await db.exec('set role anon');
 await assert.rejects(db.query(rpc('pull')));
 await assert.rejects(db.query('select * from public.norsk_eventyr_sync'));
 // The final cutover must actually revoke every legacy function in production.
 await db.close();
 console.log('PASS staged sync SQL: authenticated ownership, migration claim, revision conflict, cross-user denial and RLS');
})().catch(e=>{console.error(e);process.exit(1)});
