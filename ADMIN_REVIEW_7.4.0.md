# Norsk Eventyr 7.4.0 — Admin Dashboard + User Timeline

Date: 2026-10-05

## Release scope

7.4.0 supersedes the unpublished 7.3.9 release and is intended to ship directly from production 7.3.8.

It includes:
- 7.3.9 growth funnel and first-touch acquisition attribution;
- a separate responsive owner Admin Dashboard;
- per-user lifecycle history;
- payment-ready subscription and payment ledgers;
- privacy notice v3.

## Admin navigation

Mobile-first navigation:
1. Главная
2. Пользователи
3. Платежи
4. События
5. Ещё

### Главная
Shows:
- users;
- active trials;
- purchase interest;
- paid users;
- 30-day revenue;
- 30-day fees;
- failed payments;
- upcoming renewals;
- app errors;
- conversion funnel;
- latest lifecycle events.

### Пользователи
Search/filter and per-user card with:
- confirmed email;
- trial dates;
- install;
- activity-day count;
- acquisition source;
- purchase interest;
- subscription status;
- paid-until date;
- next payment date;
- access decision actions.

Opening a user shows a complete significant-event timeline and that user's payments.

### Платежи
Prepared for verified Stripe webhook data:
- amount;
- status;
- fee;
- refund;
- paid period;
- failure reason;
- user;
- payment date.

There is deliberately NO client-side payment-write API. Authenticated users cannot insert/update payment or subscription rows.

### События
Global owner-only feed of meaningful lifecycle events.

### Ещё
Feedback moderation, client errors, owner backup.

## Lifecycle data minimization

Norsk Eventyr does NOT create page-by-page clickstream histories.

Tracked lifecycle events are limited to meaningful account/business events, including:
- email confirmed;
- terms/privacy accepted;
- trial started;
- scheduled trial end;
- app installation;
- active 3+ days;
- purchase interest;
- access request/decision;
- future payment/subscription status events.

Payment card numbers are not stored in Norsk Eventyr.

## Payment model

New private tables:
- norsk_eventyr_subscriptions
- norsk_eventyr_payments

Direct access is revoked from anon/authenticated.

Future Stripe webhooks will write verified data server-side. Until Stripe is connected:
- paid users = 0 unless verified payment data is inserted server-side;
- revenue/fees/payment history remain empty;
- no user can fake a paid period from the browser.

## Privacy rollout

Frontend privacy version: 2026-10-05-v3.

Initial release stays in transition mode:
- existing v1/v2 clients remain accepted server-side;
- 7.4.0 users are prompted to review v3;
- new 7.4.0 users accept v3;
- legacy cached clients are not broken.

Strict v3 enforcement remains under:
deferred/20261005_privacy_v3_finalize.sql

DO NOT apply that deferred script in the initial 7.4.0 release.

## Required production release order

1. Recheck main is still the expected 7.3.8 production base.
2. Apply migrations/20261005_growth_funnel.sql.
3. Verify growth schema and v1/v2/v3 transition behavior.
4. Apply migrations/20261005_admin_lifecycle.sql.
5. Verify lifecycle/payment tables are private and owner RPCs work.
6. Merge the verified 7.4.0 PR with its exact head SHA.
7. Wait for Vercel production READY and GitHub Vercel success.
8. Smoke-check production version and owner APIs.
9. Do NOT apply deferred/20261005_privacy_v3_finalize.sql.

## Rollback

If code rollback is required, leave additive database tables/columns in place. Production 7.3.8 does not depend on them, and dropping them during an incident would create unnecessary data-loss risk.

No production database change is authorized merely by preparing this branch.
