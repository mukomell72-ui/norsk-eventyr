# Norsk Eventyr 7.4.0 — Combined Release

Date: 2026-10-05

## One publication package

This release supersedes the unpublished 7.3.9 work. It must be published as one version: 7.4.0.

Included in this single release:
- growth funnel from first opening to paid user;
- first-touch acquisition attribution (UTM/referral/direct);
- purchase-interest signal for 99 NOK;
- responsive owner Admin Dashboard;
- users list with search and filters;
- per-user lifecycle timeline;
- payment-ready subscription ledger;
- payment-ready payment ledger;
- paid-until / next-payment fields;
- payment fee, refund and failure fields;
- owner event feed;
- feedback moderation and error view;
- backup v3;
- privacy notice v3 with transition compatibility.
- owner identity removed from normal UI and tracked public source; legal controller identity is loaded on demand from protected server configuration only inside the legal/privacy disclosure.

## Owner dashboard

Navigation:
- Главная
- Пользователи
- Платежи
- События
- Ещё

Per-user lifecycle:
registration -> email confirmed -> terms/privacy accepted -> trial started -> trial end -> install -> active 3+ days -> purchase interest -> access decision -> payment/subscription events.

The system intentionally does not keep a page-by-page clickstream.

## Payment safety

No browser/client API can write payment or subscription rows.
Direct table access is revoked from anon/authenticated users.

Real paid state will be populated only by a future verified Stripe server/webhook integration.
Until Stripe is connected, no card is charged and payment history stays empty unless trusted server-side data is written.

Norsk Eventyr does not store bank card numbers.

## Private owner-authorization preflight

Before applying the 7.4.0 database migrations, privately mark the confirmed owner Auth account with `raw_app_meta_data.ne_owner=true`. Do not commit the owner's email, user ID, or other personal identifier to the repository.

The 7.4.0 growth migration replaces the legacy email-based owner check with protected Auth app metadata. The owner flag must exist before that migration is applied, otherwise owner-only RPC access will be unavailable until the flag is set.

## Database release steps

The production release has two additive migrations, both belonging to this same 7.4.0 publication:

1. migrations/20261005_growth_funnel.sql
2. migrations/20261005_admin_lifecycle.sql

They are intentionally kept as two ordered migrations rather than concatenated into one file so failure/verification boundaries remain clear.

Strict privacy-v3 enforcement is NOT part of the initial publication:
- deferred/20261005_privacy_v3_finalize.sql

Do not apply the deferred file during the initial 7.4.0 release.

## Verified database QA

Tested in BEGIN/ROLLBACK:
- privacy v1 transition: PASS
- privacy v2 transition: PASS
- privacy v3 transition: PASS
- current privacy version reporting: PASS
- email-confirm lifecycle event: PASS
- payment table direct access revoked: PASS
- subscription table direct access revoked: PASS
- paid-period model: PASS
- payment lifecycle event: PASS
- owner user detail/timeline: PASS
- owner overview: PASS
- owner event feed: PASS
- backup v3: PASS

Rollback verified: no QA schema/data persisted.

## Code checks

Syntax checked:
- access.js
- admin-dashboard.js
- feedback.js
- ui-v8.js
- app.js
- sw.js
- api/_access.js
- lib/access-handler.js

Vercel preview has built successfully for the 7.4.0 branch.

## Production release order

1. Reconfirm production main is still 7.3.8.
2. Reconfirm PR head/base and the latest available preview/build evidence.
3. Privately set and verify the confirmed owner account's `raw_app_meta_data.ne_owner=true` without committing the identity.
4. Apply growth migration.
5. Verify owner authorization, growth and privacy transition.
6. Apply admin lifecycle migration.
7. Verify private payment/subscription tables and owner RPCs.
8. Merge the 7.4.0 PR using its exact verified head SHA.
9. Wait for Vercel production READY/SUCCESS.
10. Smoke-check production version and owner dashboard.
11. Do not apply deferred strict privacy-v3 migration.

## Rollback rule

If application code must be rolled back, keep the additive database tables/columns in place. Dropping them during rollback would add avoidable data-loss risk.

Production publication requires explicit owner authorization.
