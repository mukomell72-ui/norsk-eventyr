// Deterministic offline safety review. This is NOT evidence that live infra is ready.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const guard=read('api/_guard.js');
const cloud=read('api/cloud.js');
const quota=read('deferred/SECURITY_8_2_DISTRIBUTED_QUOTA.sql');
const sync=read('deferred/SECURITY_8_2_SYNC_PREPARE.sql');
const cutover=read('deferred/SECURITY_8_2_SYNC_CUTOVER.sql');
const android=read('android-test/app/build.gradle');
const ui=read('elite.js');
const imports=read('v3.js');
const plan=read('SECURITY_RELEASE_PLAN_8_2.md');
const headers=JSON.parse(read('vercel.json')).headers;
const billable=['chat','evaluate','generate','speech','transcribe','pronounce','drill','daily','listening-questions'];
for(const endpoint of billable){
  const route='/api/'+endpoint;
  assert(guard.includes("'"+route+"'"),'missing server quota for '+route);
  assert(quota.includes("('"+route+"'"),'missing distributed SQL cap for '+route);
  assert(read('api/'+endpoint+'.js').includes('guard('),'unprotected AI endpoint '+route);
}
assert(guard.includes('process.env.VERCEL_ENV==="production"'),'production quota enforcement required');
assert(guard.includes('const dedicated=process.env.NE_SESSION_SECRET'),'standalone production session key required');
assert(guard.includes("res.status(503).json({error:'AI_QUOTA_UNAVAILABLE'"),'quota outage must block paid AI');
assert(cloud.includes('process.env.VERCEL_ENV==="production"'),'production must use v2 authenticated cloud RPC');
assert(cloud.includes('"Authorization":"Bearer "+token'),'cloud RPC must use verified access token');
assert(sync.includes('v_row.owner_user_id <> v_uid'),'sync must bind progress to the user');
assert(sync.includes("grant execute on function public.ne_sync_v2")&&sync.includes('to authenticated'),'v2 only for authenticated account');
for(const action of ['create','pull','push','delete']){
 assert(cutover.includes('public.norsk_eventyr_sync_'+action),'old anonymous sync '+action+' must be disabled at cutover');
}
assert(android.includes('Production is forbidden'),'private debug APK must not point to Production');
assert(ui.includes('function deleteCloudData()'),'user-controlled cloud copy removal missing');
assert(imports.includes('BACKUP_TOO_LARGE'),'backup import must enforce a size limit');
assert(plan.includes('NO-GO'),'release plan must document stop conditions');
const csp=headers.flatMap(h=>h.headers||[]).find(h=>h.key==='Content-Security-Policy');
assert(csp?.value.includes("frame-ancestors 'none'"),'clickjacking CSP protection required');
console.log('PASS offline release invariants across AI RPC quota, account-bound sync, private APK, backups and CSP');
