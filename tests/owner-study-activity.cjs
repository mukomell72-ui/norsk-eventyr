// Admin activity telemetry regression: static security checks and simulated browser opt-in.
// This is not a production database integration test.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const sql=read('deferred/OWNER_STUDY_ACTIVITY_2026-10-15.sql');
const handler=read('lib/access-handler.js'),dashboard=read('admin-dashboard.js');
const html=read('index.html'),sw=read('sw.js'),access=read('access.js');
const src=read('study-activity.js');
for(const t of ['norsk_eventyr_study_presence','norsk_eventyr_study_daily']){
 assert(sql.includes('create table if not exists public.'+t),'missing persistence '+t);
 assert(sql.includes('alter table public.'+t+' enable row level security'),'RLS missing '+t);
 assert(sql.includes('revoke all on public.'+t+' from public,anon,authenticated'),'raw table access exposed '+t);
}
for(const rpc of ['ne_study_heartbeat(integer)','ne_owner_study_activity()','ne_owner_study_activity_days(uuid)']){
 assert(sql.includes('revoke all on function public.'+rpc+' from public,anon,authenticated'),'public RPC exposed '+rpc);
 assert(sql.includes('grant execute on function public.'+rpc+' to authenticated'),'authenticated RPC inaccessible '+rpc);
}
assert(sql.includes('if not public.ne_access_owner() then raise exception'), 'RPC owner check is missing');
assert(sql.includes('auth.uid()'),'Heartbeat must bind identity to authenticated user');
assert(sql.includes('least(p_seconds,30'),'Heartbeat server duration must be bounded');
assert(sql.includes("time zone 'Europe/Oslo'"),'Daily grouping must use a defined time zone');
assert(handler.includes("action==='study_heartbeat'"),'Tracker endpoint missing');
assert(handler.includes("action==='study_opt_out'"),'Revocation endpoint missing');
assert(src.includes("action:'study_opt_out'"),'Opt-out must request deletion');
assert(sql.includes('create or replace function public.ne_study_opt_out()'),'Database-side opt-out missing');
assert(read('deferred/OWNER_STUDY_ACTIVITY_RETENTION_2026-10-15.sql').includes("cron.schedule('norsk-eventyr-study-retention-90d'"),'Retention schedule missing');
assert(handler.includes("identity.access.access_granted!==true"),'Tracker endpoint must enforce valid app access');
assert(handler.includes("action==='owner_study_activity'"),'Owner summary endpoint missing');
assert(handler.includes("action==='owner_study_activity_days'"),'Owner daily endpoint missing');
assert(handler.includes("if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'})"),'Owner access control missing');
assert(dashboard.includes("['activity','Активность']"),'Admin activity tab not linked');
assert(dashboard.includes('Пассивные 7+ дней'),'Inactivity filter missing');
assert(dashboard.includes("call('owner_study_activity_days'"),'Daily breakdown missing');
assert(dashboard.includes("type==='passive')counts.passive++"),'Unmeasured users must not be counted as inactive');
assert(html.includes('/study-activity.js?v=8.3.0-lesson21'),'Tracker not loaded');
assert(sw.includes('/study-activity.js?v=8.3.0-lesson21'),'Tracker not available in offline cache');
assert(access.includes('studyConsentToggle')&&access.includes('По отдельному выбору пользователя'),'Consent and disclosure missing');
assert(!src.includes('navigator.sendBeacon'),'No unprotected beacon telemetry');
const subs={},local=new Map(),requests=[];
let notice=null,tick=null,hidden=false,allowed=true,userId='test-user-1';
function node(tag){
 return {tag,children:[],append(...children){this.children.push(...children)},setAttribute(){},remove(){if(notice===this)notice=null}};
}
const doc={
 body:{append(item){notice=item}},
 get hidden(){return hidden},
 getElementById(id){return id==='app'?{hidden:false}:id==='neStudyActivityNotice'?notice:null},
 createElement:node,
 addEventListener(name,fn){subs[name]=fn}
};
const win={
 NEAccess:{info:()=>({user_id:userId,owner:false}),allowed:()=>allowed,headers:()=>({'x-ne-device-id':'test-device'})},
 addEventListener(name,fn){subs['window:'+name]=fn}
};
const sandbox={window:win,document:doc,localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},
 setInterval(fn){tick=fn},fetch:async(url,opts)=>{requests.push({url,body:JSON.parse(opts.body)});return{ok:true}},
 Date,console};
vm.runInNewContext(src,sandbox,{filename:'study-activity.js'});
assert.equal(typeof win.NEStudyActivity?.setConsent,'function');
for(let i=0;i<4;i++)tick();
assert(notice,'Disclosure must be shown before any tracking');
allowed=false;tick();
assert.equal(notice,null,'Consent notice must disappear when account access is revoked');
allowed=true;tick();
assert(notice,'Disclosure returns once account access is restored');
assert(read('access.css').includes('.access-gate:not([hidden]) ~ .ne-study-notice{display:none!important}'),'Login / revoked gate must hide consent overlay immediately');
assert.equal(requests.length,0,'No tracking before opt-in');
const controls=notice.children[2];
controls.children[0].onclick();
assert.equal(win.NEStudyActivity.consent(),'yes');
async function finish(){
 // The simulated timer runs synchronously, so let both the baseline
 // heartbeat and the queued batch drain through asynchronous fetch.
 for(let i=0;i<12;i++)await Promise.resolve();
 for(let i=0;i<30;i++)tick();
 for(let i=0;i<12;i++)await Promise.resolve();
 assert(requests.some(x=>x.body.action==='study_heartbeat'&&x.body.seconds===0),'Initial server-side timestamp missing');
 assert(requests.some(x=>x.body.action==='study_heartbeat'&&x.body.seconds>0),'Active seconds not recorded');
 const previous=requests.length;
 win.NEStudyActivity.setConsent(false);
 for(let i=0;i<60;i++)tick();
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert(requests.some(x=>x.body.action==='study_opt_out'),'Opt-out must erase server-side history');
 assert(requests.filter(x=>x.body.action==='study_heartbeat').length===previous,'Opt-out must immediately stop future heartbeat');
 hidden=true;
 subs.visibilitychange?.();
 for(let i=0;i<40;i++)tick();
 assert.equal(requests.filter(x=>x.body.action==='study_heartbeat').length,previous,'Hidden app must not continue counting');
 console.log('PASS owner study activity: owner-only RPC permissions, verified-user heartbeat, opt-in/out, hidden-tab behavior and PWA assets');
}
finish().catch(e=>{console.error(e);process.exitCode=1});
