const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.NE_PGLITE_PATH||'@electric-sql/pglite');
const migration=fs.readFileSync(path.join(__dirname,'../migrations/20261008_access_billing_controls.sql'),'utf8');

(async()=>{
 const db=new PGlite();
 await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;

  create table auth.users(
    id uuid primary key,
    email text not null,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb not null default '{}'::jsonb,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;

  create table public.norsk_eventyr_access(
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    display_name text not null,
    status text not null default 'pending' check(status in ('pending','approved','denied','revoked')),
    requested_at timestamptz not null default now(),
    decided_at timestamptz
  );

  create table public.norsk_eventyr_entitlements(
    user_id uuid primary key references auth.users(id) on delete cascade,
    trial_started_at timestamptz not null default now(),
    trial_ends_at timestamptz not null default (now()+interval '5 days'),
    referral_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,24)),
    referred_by uuid references auth.users(id) on delete set null,
    referral_bonus_granted_at timestamptz,
    terms_version text,
    terms_accepted_at timestamptz,
    privacy_version text,
    privacy_accepted_at timestamptz,
    activity_days_count integer not null default 0,
    purchase_interest_at timestamptz,
    purchase_interest_last_at timestamptz,
    purchase_interest_price_nok integer,
    first_paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table public.norsk_eventyr_subscriptions(
    user_id uuid primary key references auth.users(id) on delete cascade,
    provider text not null default 'stripe',
    provider_customer_id text,
    provider_subscription_id text unique,
    status text not null default 'inactive',
    plan_code text not null default 'monthly_99',
    amount_nok numeric(12,2) not null default 99,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    canceled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table public.norsk_eventyr_payments(
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null default 'stripe',
    provider_event_id text unique,
    provider_payment_id text,
    provider_subscription_id text,
    status text not null default 'pending',
    currency text not null default 'NOK',
    amount_nok numeric(12,2) not null default 0,
    fee_nok numeric(12,2) not null default 0,
    refunded_nok numeric(12,2) not null default 0,
    period_start timestamptz,
    period_end timestamptz,
    paid_at timestamptz,
    failure_code text,
    failure_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table public.norsk_eventyr_feedback(
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
  );
  create table public.norsk_eventyr_installs(
    user_id uuid primary key references auth.users(id) on delete cascade,
    first_installed_at timestamptz,
    last_seen_installed_at timestamptz,
    platform text,
    source text
  );
  create table public.norsk_eventyr_growth_daily(
    day date primary key,
    first_visits bigint not null default 0
  );
  create table public.norsk_eventyr_lifecycle_events(
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    event_type text not null,
    event_key text unique,
    occurred_at timestamptz not null default now(),
    source text not null default 'system',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table public.norsk_eventyr_client_errors(
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
  );

  create function public.ne_access_owner() returns boolean
  language sql stable security definer set search_path=''
  as $$select exists(
    select 1 from auth.users
    where id=auth.uid()
      and email_confirmed_at is not null
      and coalesce(raw_app_meta_data,'{}'::jsonb)->>'ne_owner'='true'
  )$$;

  create function public.ne_is_norsk_eventyr_user(p_user_id uuid) returns boolean
  language sql stable security definer set search_path=''
  as $$select exists(select 1 from auth.users where id=p_user_id)$$;

  create function public.ne_lifecycle_record(
    p_user_id uuid,p_event_type text,p_occurred_at timestamptz default now(),
    p_source text default 'system',p_metadata jsonb default '{}'::jsonb,p_event_key text default null
  ) returns void
  language plpgsql security definer set search_path=''
  as $$
  begin
    insert into public.norsk_eventyr_lifecycle_events(user_id,event_type,event_key,occurred_at,source,metadata)
    values(p_user_id,p_event_type,p_event_key,coalesce(p_occurred_at,now()),p_source,p_metadata)
    on conflict(event_key) do nothing;
  end
  $$;

  -- Legacy 8.0.0 RPC sentinels: the staged 8.0.1 migration must not replace them.
  create function public.ne_access_status() returns jsonb
  language sql security definer as $$select '{"legacy":true}'::jsonb$$;
  create function public.ne_accept_terms(text,text,text) returns jsonb
  language sql security definer as $$select '{"legacy":true}'::jsonb$$;
  create function public.ne_purchase_interest(integer default 99) returns jsonb
  language sql security definer as $$select '{"legacy":true}'::jsonb$$;

  create function public.ne_access_decide(p_user_id uuid,p_status text) returns jsonb
  language sql security definer as $$select '{"legacy_decide":true}'::jsonb$$;

  insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
   ('11111111-1111-4111-8111-111111111111','owner@example.test',now(),'{"ne_owner":true}'::jsonb,'{"ne_app":"norsk_eventyr"}'::jsonb),
   ('22222222-2222-4222-8222-222222222222','student@example.test',now(),'{}'::jsonb,'{"ne_app":"norsk_eventyr"}'::jsonb),
   ('33333333-3333-4333-8333-333333333333','legacy@example.test',now(),'{}'::jsonb,'{"ne_app":"norsk_eventyr"}'::jsonb),
   ('44444444-4444-4444-8444-444444444444','other@example.test',now(),'{}'::jsonb,'{"ne_app":"norsk_eventyr"}'::jsonb);

  insert into public.norsk_eventyr_access(user_id,email,display_name,status) values
   ('22222222-2222-4222-8222-222222222222','student@example.test','Student','pending'),
   ('33333333-3333-4333-8333-333333333333','legacy@example.test','Legacy','approved'),
   ('44444444-4444-4444-8444-444444444444','other@example.test','Other','approved');

  insert into public.norsk_eventyr_entitlements(
    user_id,trial_started_at,trial_ends_at,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at
  ) values
   ('22222222-2222-4222-8222-222222222222',now()-interval '10 days',now()-interval '5 days','2026-10-05-v1',now()-interval '10 days','2026-10-05-v3',now()-interval '10 days'),
   ('33333333-3333-4333-8333-333333333333',now()-interval '20 days',now()-interval '15 days','2026-10-05-v1',now()-interval '20 days','2026-10-05-v3',now()-interval '20 days'),
   ('44444444-4444-4444-8444-444444444444',now()-interval '20 days',now()-interval '15 days','2026-10-08-v2',now()-interval '20 days','2026-10-08-v4',now()-interval '20 days');

  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
 `);

 await db.exec(migration);

 const owner='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222',other='44444444-4444-4444-8444-444444444444';
 async function as(id,sql,params=[]){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.sub',$1,false)",[id]);
  await db.exec('set role authenticated');
  return db.query(sql,params);
 }
 const one=result=>Object.values(result.rows[0])[0];

 // Staged rollout: old 8.0.0 RPCs remain untouched.
 assert.equal(one(await as(student,'select public.ne_access_status()')).legacy,true);
 assert.equal(one(await as(student,'select public.ne_purchase_interest(99)')).legacy,true);

 // Existing approved user receives transition grace, but v2 still requires new terms.
 await db.exec('reset role');
 const grace=(await db.query("select free_access_until from public.norsk_eventyr_entitlements where user_id='33333333-3333-4333-8333-333333333333'")).rows[0].free_access_until;
 assert(new Date(grace).getTime()>Date.now());

 let status=one(await as(student,'select public.ne_access_status_v2()'));
 assert.equal(status.status,'terms_required');

 status=one(await as(student,"select public.ne_accept_terms_v2('2026-10-08-v2','2026-10-08-v4',null)"));
 assert.equal(status.status,'pending');
 assert.equal(status.access_granted,false);

 // Ready-to-pay never bypasses owner approval.
 let interest=one(await as(student,'select public.ne_purchase_interest_v2(99)'));
 assert.equal(interest.bonus_pending,true);
 assert.equal(interest.bonus_granted,false);
 await db.exec('reset role');
 let ent=(await db.query("select free_access_until,ready_bonus_granted_at from public.norsk_eventyr_entitlements where user_id=$1",[student])).rows[0];
 assert.equal(ent.ready_bonus_granted_at,null);

 // Owner approval is the second condition; it grants exactly one 30-day bonus.
 let decision=one(await as(owner,"select public.ne_access_decide('22222222-2222-4222-8222-222222222222','approved')"));
 assert.equal(decision.bonus_granted,true);
 status=one(await as(student,'select public.ne_access_status_v2()'));
 assert.equal(status.status,'free');
 assert.equal(status.access_granted,true);
 const firstFree=new Date(status.free_access_until).getTime();
 assert(firstFree>Date.now());

 interest=one(await as(student,'select public.ne_purchase_interest_v2(99)'));
 assert.equal(interest.bonus_granted,false);
 assert.equal(interest.bonus_already_used,true);
 await db.exec('reset role');
 assert.equal(Number(one(await db.query("select count(*) from public.norsk_eventyr_access_grants where user_id=$1 and grant_type='ready_bonus'",[student]))),1);

 // Owner can extend free access repeatedly.
 let grant=one(await as(owner,"select public.ne_owner_grant_free('22222222-2222-4222-8222-222222222222',7,'QA free')"));
 const secondFree=new Date(grant.free_access_until).getTime();assert(secondFree>firstFree);
 grant=one(await as(owner,"select public.ne_owner_grant_free('22222222-2222-4222-8222-222222222222',7,'QA free 2')"));
 const thirdFree=new Date(grant.free_access_until).getTime();assert(thirdFree>secondFree);
 await db.exec('reset role');
 assert.equal(Number(one(await db.query("select count(*) from public.norsk_eventyr_access_grants where user_id=$1 and grant_type='owner_free'",[student]))),2);

 // Promo is single-use per account and limited globally.
 let promo=one(await as(owner,"select public.ne_owner_promo_create('TEST30',30,1,null,'QA promo')"));
 assert.equal(promo.code,'TEST30');
 let redeemed=one(await as(student,"select public.ne_promo_redeem('TEST30')"));
 assert.equal(redeemed.days,30);
 await assert.rejects(as(student,"select public.ne_promo_redeem('TEST30')"));
 await as(other,"select public.ne_accept_terms_v2('2026-10-08-v2','2026-10-08-v4',null)");
 await assert.rejects(as(other,"select public.ne_promo_redeem('TEST30')"));

 // Manual payment remains a separate paid ledger and starts after existing access.
 let payment=one(await as(owner,"select public.ne_owner_confirm_manual_payment('22222222-2222-4222-8222-222222222222',99,30,'QA manual')"));
 assert(new Date(payment.period_end).getTime()>new Date(payment.period_start).getTime());
 await db.exec('reset role');
 const paid=(await db.query("select provider,status,amount_nok,period_start,period_end from public.norsk_eventyr_payments where user_id=$1 order by created_at desc limit 1",[student])).rows[0];
 assert.equal(paid.provider,'manual');assert.equal(paid.status,'paid');assert.equal(Number(paid.amount_nok),99);
 const sub=(await db.query("select provider,status,current_period_start,current_period_end,cancel_at_period_end from public.norsk_eventyr_subscriptions where user_id=$1",[student])).rows[0];
 assert.equal(sub.provider,'manual');assert.equal(sub.status,'active');assert.equal(sub.cancel_at_period_end,true);
 assert(new Date(sub.current_period_start).getTime()>=new Date(redeemed.free_access_until).getTime()-1000);

 // Device 1 works. Device 2 is blocked while device 1 is active, without registering itself.
 let device=one(await as(student,"select public.ne_device_authorize('device_1111111111111111','Phone')"));
 assert.equal(device.allowed,true);
 device=one(await as(student,"select public.ne_device_authorize('device_2222222222222222','PC')"));
 assert.equal(device.allowed,false);assert.equal(device.reason,'CONCURRENT_DEVICE');
 await db.exec('reset role');
 assert.equal(Number(one(await db.query("select count(*) from public.norsk_eventyr_devices where user_id=$1",[student]))),1);

 // After inactivity, second trusted device can register. A third cannot.
 await db.query("update public.norsk_eventyr_devices set last_seen_at=now()-interval '10 minutes' where user_id=$1",[student]);
 device=one(await as(student,"select public.ne_device_authorize('device_2222222222222222','PC')"));
 assert.equal(device.allowed,true);
 await db.exec('reset role');
 await db.query("update public.norsk_eventyr_devices set last_seen_at=now()-interval '10 minutes' where user_id=$1",[student]);
 device=one(await as(student,"select public.ne_device_authorize('device_3333333333333333','Tablet')"));
 assert.equal(device.allowed,false);assert.equal(device.reason,'DEVICE_LIMIT');

 // Direct table access stays closed.
 await assert.rejects(as(student,'select * from public.norsk_eventyr_promo_codes'));
 await assert.rejects(as(student,'select * from public.norsk_eventyr_devices'));

 const reset=one(await as(owner,"select public.ne_owner_devices_reset('22222222-2222-4222-8222-222222222222')"));
 assert.equal(reset.revoked_devices,2);

 await db.close();
 console.log('PASS 8.0.1 SQL behavior: staged compatibility, approval-gated bonus, repeatable free access, promo, manual paid ledger and trusted-device limits');
})().catch(e=>{console.error(e);process.exit(1)});
