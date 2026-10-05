# Norsk Eventyr 7.3.9 — Growth Funnel review

Date: 2026-10-05

## Goal

Measure the real acquisition funnel without storing detailed behavioral histories:
first opening -> registration -> confirmed email -> trial -> install -> active 3+ days -> trial ended -> purchase interest -> paid.

## Data minimization

- Anonymous pre-registration tracking stores only an aggregate daily first-opening counter.
- The application does not store IP addresses in the Norsk Eventyr growth table.
- A browser is counted once using a local first-party localStorage marker. Clearing browser/site data can make the same browser count again, so this metric is approximate.
- Authenticated activity stores only:
  - total count of active days;
  - last activity date.
- It does not store a page-by-page activity history.
- Purchase interest stores the first/last time the user clicked the 99 NOK interest button and the displayed price.
- Acquisition attribution stores sanitized first-touch UTM source/campaign/medium in Supabase Auth user metadata at registration.
- Referral users are reported as source "referral".
- The "paid" funnel stage is prepared through first_paid_at but is not writable by users and remains zero until a verified payment integration is implemented.

## Privacy notice rollout

Frontend privacy notice becomes 2026-10-05-v2.

The release migration intentionally runs in transition mode:
- existing privacy v1 users remain valid for old 7.3.8 clients;
- 7.3.9 receives accepted_privacy_version and prompts v1 users to review and accept v2;
- new 7.3.9 registrations accept v2;
- old cached 7.3.8 clients are not broken by immediate server-side enforcement.

Strict server-side v2 enforcement is stored under deferred/ and MUST NOT be applied during the initial 7.3.9 release. Apply it only after old active clients have had time to upgrade and compatibility has been rechecked.

## Security

- Growth tables have RLS enabled and direct SELECT/UPDATE access revoked from anon/authenticated.
- ne_growth_first_visit() is intentionally anonymous and SECURITY DEFINER because it writes only an aggregate counter. It can be rate-limited at the application API layer, but direct public RPC abuse can still inflate this non-security-critical marketing metric.
- Authenticated growth functions require a confirmed authenticated user.
- Owner funnel data requires ne_access_owner().
- No payment or banking data is collected by this release.

## Release order

1. Recheck PR head/base and Vercel preview.
2. Apply migrations/20261005_growth_funnel.sql to production Supabase.
3. Verify new schema/functions and transition compatibility.
4. Merge 7.3.9 PR with the verified head SHA.
5. Wait for Vercel production READY/SUCCESS.
6. Smoke-check main version and growth RPCs.
7. Do NOT apply deferred/20261005_growth_privacy_v2_finalize.sql in this release.

## Rollback

7.3.8 code remains compatible with the transition-mode growth schema. If application rollback is required, leave the additive growth schema in place; do not rush to drop columns/functions. The deferred strict privacy migration must remain unapplied.
