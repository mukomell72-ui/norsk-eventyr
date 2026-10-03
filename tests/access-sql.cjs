const assert=require('assert/strict'),fs=require('fs');
const {PGlite}=require(process.env.NE_PGLITE_PATH||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 insert into auth.users values('11111111-1111-4111-8111-111111111111','mukomell72@gmail.com',now()),('22222222-2222-4222-8222-222222222222','student@example.com',now()),('33333333-3333-4333-8333-333333333333','unconfirmed@example.com',null);
 `);await db.exec(fs.readFileSync(require('path').join(__dirname,'../migrations/20261003_access_approval.sql'),'utf8'));
 const owner='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
 async function as(id,sql){await db.exec('reset role');await db.query("select set_config('request.jwt.sub',$1,false)",[id]);await db.exec('set role authenticated');return db.query(sql)}
 const val=result=>Object.values(result.rows[0])[0];
 assert.equal(val(await as(owner,'select public.ne_access_status()')).owner,true);
 assert.equal(val(await as(student,'select public.ne_access_status()')).status,'unrequested');
 assert.equal(val(await as(student,"select public.ne_access_request('Anna')")).status,'pending');
 await assert.rejects(as(student,"select public.ne_access_decide('22222222-2222-4222-8222-222222222222','approved')"));
 await assert.rejects(as(student,'select * from public.norsk_eventyr_access'));
 for(const state of ['approved','revoked','denied']){await as(owner,`select public.ne_access_decide('${student}','${state}')`);assert.equal(val(await as(student,'select public.ne_access_status()')).status,state);assert.equal(val(await as(student,"select public.ne_access_request('Anna again')")).status,state)}
 assert.equal(val(await as(owner,'select public.ne_access_list()')).length,1);
 await assert.rejects(as('33333333-3333-4333-8333-333333333333','select public.ne_access_status()'));
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select public.ne_access_status()'));await db.close();console.log('PASS actual SQL migration: owner identity, verified email, pending request, approval/revocation, no self-approval, denied RLS/table access, no anonymous RPC');
})().catch(e=>{console.error(e);process.exit(1)});
