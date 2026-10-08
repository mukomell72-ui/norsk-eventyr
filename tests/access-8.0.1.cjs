const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration=read('migrations/20261008_access_billing_controls.sql');
const handler=read('lib/access-handler.js'),accessApi=read('api/_access.js'),access=read('access.js');
const admin=read('admin-dashboard.js'),v3=read('v3.js'),app=read('app.js'),feedback=read('feedback.js');
const health=read('api/health.js'),sw=read('sw.js'),index=read('index.html');

for(const table of ['norsk_eventyr_access_grants','norsk_eventyr_promo_codes','norsk_eventyr_promo_redemptions','norsk_eventyr_devices']){
 assert(migration.includes('create table if not exists public.'+table),table+' missing');
 assert(migration.includes('revoke all on table public.'+table+' from public,anon,authenticated'),table+' direct access not revoked');
}
assert(migration.includes('add column if not exists free_access_until'),'free-access entitlement missing');
assert(migration.includes('add column if not exists ready_bonus_granted_at'),'one-time ready bonus marker missing');
assert(migration.includes('ready_bonus_granted_at is not null then')&&migration.includes('ne_ready_bonus_apply'),'ready-to-pay bonus must be one-time');
assert(migration.includes("p_user_id,'ready_bonus',30"),'ready-to-pay 30-day audit grant missing');
assert(migration.includes('create or replace function public.ne_promo_redeem'),'promo redemption RPC missing');
assert(migration.includes('primary key(promo_id,user_id)'),'promo must be single-use per account');
assert(migration.includes('create or replace function public.ne_owner_grant_free'),'owner repeatable free grant RPC missing');
assert(migration.includes('p_days not between 1 and 3650'),'owner grant bounds missing');
assert(migration.includes('create or replace function public.ne_owner_confirm_manual_payment'),'manual payment confirmation RPC missing');
assert(migration.includes("'manual_monthly'"),'manual paid subscription plan missing');
assert(migration.includes("provider='manual'"),'manual payment provider separation missing');
assert(!/elsif req_status='approved' then\s*effective_status := 'approved'; granted := true/.test(migration),'approval alone must not grant unlimited access');
assert(migration.includes("effective_status := 'paid'; granted := true"),'paid access status missing');
assert(migration.includes("effective_status := 'free'; granted := true"),'free access status missing');
assert(migration.includes("effective_status := 'trial'; granted := true"),'trial access status missing');

assert(migration.includes('create or replace function public.ne_device_authorize'),'device authorization RPC missing');
assert(migration.includes('active_devices>=2'),'two-device limit missing');
assert(migration.includes("last_seen_at>now()-interval '3 minutes'"),'concurrent-device guard missing');
assert(migration.includes('pg_advisory_xact_lock'),'device slot race protection missing');
assert(migration.indexOf("last_seen_at>now()-interval '3 minutes'")<migration.indexOf("set device_name=clean_name,last_seen_at=now()"),'concurrent-device guard must run before touching current last_seen');
assert(migration.includes('create or replace function public.ne_owner_devices_reset'),'owner device reset missing');
assert(accessApi.includes("'x-ne-device-id'")&&accessApi.includes('ne_device_authorize'),'server device enforcement missing');
for(const source of [access,v3,app,feedback,admin])assert(source.includes('NEAccess')||source.includes('deviceHeaders'),'device headers missing from client surface');
assert(access.includes("headers:deviceHeaders"),'device headers must be exposed to learning modules');

assert(access.includes("TERMS_VERSION='2026-10-08-v2'"),'8.0.1 terms version missing');
assert(access.includes("PRIVACY_VERSION='2026-10-08-v4'"),'8.0.1 privacy version missing');
assert(migration.includes("create or replace function public.ne_access_status_v2()")&&migration.includes("current_terms constant text := '2026-10-08-v2'"),'database terms version mismatch');
assert(!migration.includes('create or replace function public.ne_access_status()'),'staged migration must not replace the 8.0.0 access RPC');
assert(!migration.includes('create or replace function public.ne_purchase_interest('),'staged migration must not replace the 8.0.0 purchase-interest RPC');
assert(migration.includes("req_status is distinct from 'approved'"),'post-trial free/paid access must require owner approval');
assert(migration.includes("bonus_until := public.ne_ready_bonus_apply(p_user_id)"),'owner approval must grant pending ready-to-pay bonus');
assert(migration.includes("create or replace function public.ne_accept_terms_v2(")&&migration.includes("current_privacy constant text := '2026-10-08-v4'"),'database privacy version mismatch');

for(const action of ['promo_redeem','owner_grant_free','owner_confirm_payment','owner_promo_list','owner_promo_create','owner_promo_toggle','owner_devices_reset'])assert(handler.includes(action),action+' handler missing');
for(const action of ['owner_grant_free','owner_confirm_payment','owner_promo_create','owner_devices_reset'])assert(admin.includes("call('"+action+"'"),action+' admin UI missing');
assert(admin.includes('+30')&&admin.includes('Бесплатный доступ'),'free access controls missing');
assert(admin.includes('Подтвердить оплату'),'manual paid confirmation UI missing');
assert(admin.includes('Промокоды'),'promo manager UI missing');

assert(app.includes('APP_VERSION="8.0.1"'),'app version mismatch');
assert(health.includes('version:"8.0.1"'),'health version mismatch');
assert(index.includes('8.0.1-access-r1'),'public asset revision mismatch');
assert(sw.includes('norsk-eventyr-v8-0-1-access-r1'),'service worker revision mismatch');
assert(migration.includes("'format','norsk-eventyr-backup-v4'"),'backup v4 missing');
console.log('Norsk Eventyr 8.0.1 access, promo, paid and device controls: PASS');
