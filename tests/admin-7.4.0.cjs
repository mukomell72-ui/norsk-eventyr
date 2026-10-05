const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const access=read('access.js');
const admin=read('admin-dashboard.js');
const css=read('admin-dashboard.css');
const handler=read('lib/access-handler.js');
const migration=read('migrations/20261005_admin_lifecycle.sql');
const index=read('index.html');
const sw=read('sw.js');

assert(index.includes('/admin-dashboard.js?v=7.4.0'),'admin dashboard script missing');
assert(index.includes('/admin-dashboard.css?v=7.4.0'),'admin dashboard stylesheet missing');
assert(sw.includes('/admin-dashboard.js?v=7.4.0'),'admin dashboard not cached');
assert(sw.includes('/admin-dashboard.css?v=7.4.0'),'admin dashboard CSS not cached');
assert(access.includes('NEAdminDashboard.mount'),'owner panel is not using new dashboard');
assert(access.includes('ownerMarkFeedbackSeen'),'owner feedback badge bridge missing');
assert(admin.includes("['overview','Главная']"),'overview tab missing');
assert(admin.includes("['users','Пользователи']"),'users tab missing');
assert(admin.includes("['payments','Платежи']"),'payments tab missing');
assert(admin.includes("['events','События']"),'events tab missing');
assert(admin.includes("['service','Ещё']"),'service tab missing');
assert(admin.includes("call('owner_user_detail'"),'user detail timeline call missing');
assert(admin.includes("call('owner_payments'"),'payments view call missing');
assert(admin.includes("call('owner_events'"),'events feed call missing');
assert(admin.includes('Оплачено до'),'paid-until UI missing');
assert(admin.includes('Следующая оплата'),'next-payment UI missing');
assert(css.includes('.admin-nav'),'responsive admin navigation styles missing');
const publicSurfaces=[admin,index,read('feedback.js'),read('ui-v8.js')];
assert(access.includes('Юридическая информация'),'legal identity disclosure must be explicitly labeled');
assert(access.includes("call('legal_info')"),'legal identity must be loaded only on demand');
assert(handler.includes('NE_LEGAL_CONTROLLER_NAME'),'legal identity must come from protected server configuration');
assert(!handler.includes('controller:\''),'legal identity must not be hardcoded in the handler');
assert(publicSurfaces.every(text=>!text.includes('NE_LEGAL_CONTROLLER_NAME')),'server-only legal configuration must not leak into public surfaces');

for(const action of ['owner_admin_overview','owner_events','owner_payments','owner_user_detail']){
 assert(handler.includes("'"+action+"'"),action+' API action missing');
}
assert(handler.includes('ne_lifecycle_touch'),'lifecycle touch missing after confirmation/status');

for(const table of ['norsk_eventyr_lifecycle_events','norsk_eventyr_payments','norsk_eventyr_subscriptions']){
 assert(migration.includes('create table if not exists public.'+table),table+' table missing');
 assert(migration.includes('revoke all on table public.'+table+' from public,anon,authenticated'),table+' direct access must be revoked');
}
for(const fn of ['ne_owner_admin_overview','ne_owner_lifecycle_feed','ne_owner_payments','ne_owner_user_detail']){
 assert(migration.includes('function public.'+fn),fn+' RPC missing');
}
assert(migration.includes('ne_payment_lifecycle_trigger'),'payment lifecycle trigger missing');
assert(migration.includes('ne_subscription_lifecycle_trigger'),'subscription lifecycle trigger missing');
assert(migration.includes("'format','norsk-eventyr-backup-v3'"),'backup v3 missing');
assert(!handler.includes("action==='payment_write'"),'client payment write endpoint must not exist');
assert(!handler.includes("action==='subscription_write'"),'client subscription write endpoint must not exist');
assert(!migration.includes('service_role'),'migration must not embed service-role secret');
const identitySensitiveSql=[
 read('migrations/20261003_access_approval.sql'),
 read('migrations/20261005_professional_hardening.sql'),
 read('migrations/20261005_growth_funnel.sql'),
 migration
];
assert(identitySensitiveSql.every(text=>!/@gmail\.com/i.test(text)),'public SQL must not hardcode a personal Gmail address');
assert(read('migrations/20261005_growth_funnel.sql').includes("raw_app_meta_data")&&read('migrations/20261005_growth_funnel.sql').includes("ne_owner"),'owner authorization must use protected app metadata');
const sourceExtensions=/\.(?:js|cjs|mjs|sql|md|html|css|json|ya?ml)$/i;
function walk(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(entry.name==='.git'||entry.name==='node_modules')return [];
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):[full];
 });
}
const publicSourceFiles=walk(root).filter(file=>sourceExtensions.test(file));
const personalEmailFiles=publicSourceFiles.filter(file=>/@gmail\.com/i.test(fs.readFileSync(file,'utf8'))).map(file=>path.relative(root,file));
assert(personalEmailFiles.length===0,'tracked public source must not contain personal Gmail addresses: '+personalEmailFiles.join(', '));
console.log('Norsk Eventyr 7.4.0 admin dashboard checks: PASS');
