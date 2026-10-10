# Norsk Eventyr 8.2 — controlled release and privacy runbook
_Status: PREPARATION ONLY. No authorization to merge, publish or mutate live services._

## Version discipline
- Feature branch: `feature/8.2.0-placement-calibration`, draft PR #38.
- Do not merge `main`, publish to Vercel Production / Play, or change the currently running Supabase project without a separate explicit release authorization.
- Verify that final `PR HEAD SHA = GitHub QA success SHA = Android APK success SHA = Vercel Preview READY SHA` before considering a production operation.

## Intended server cutover — **not performed**
1. Make a recoverable database backup and restore it in an isolated clone. Test two independent learner accounts, one owner, one revoked learner, and an existing pre-8.2 cloud recovery code. Do not use real learner data for destructive tests.
2. Apply `deferred/SECURITY_8_2_DISTRIBUTED_QUOTA.sql` to **the clone**; run `tests/quota-sql-8.2.cjs`. Verify both per-hour and per-day caps and account isolation. Establish an operations plan for counters older than 35 days.
3. Apply `deferred/SECURITY_8_2_SYNC_PREPARE.sql` to **the clone**; run `tests/sync-owner-sql-8.2.cjs`. Verify that ownerless historical sync data remains recoverable by its existing 256-bit secret; the first authenticated account claiming a secret becomes its permanent owner; another account is denied even if it knows the secret. Test a wrong secret and concurrent revisions.
4. With approved release authorization, apply *additive* migrations to production, confirm the new RPCs function with authenticated JWTs, and verify that the existing 8.0.1 clients still work before switching.
5. Configure controlled Vercel Production release. The new API intentionally requires distributed quota and authenticated sync in Production and returns 503 rather than falling back to insecure direct RPC access. **Never deploy the new API before the two database preparations are verified**, otherwise AI and cloud features will stop responding.
6. Immediately after confirming every active server invocation uses `ne_sync_v2`, execute the separately staged `deferred/SECURITY_8_2_SYNC_CUTOVER.sql` with an approved maintenance window. This revokes `anon` and `authenticated` access to all four old bearer-secret RPCs. Confirm via `has_function_privilege` that anonymous users cannot call them. Do not run the cutover file on a preview or production DB in advance.
7. Verify account switching, revoked account behavior, cloud delete, real Android microphone, email/password recovery, trial approval, admin permission checks and account-specific quotas after release. Confirm a fallback and communication channel before any rollout.

## Mandatory infrastructure checks
- Configure Vercel Firewall/WAF rate limiting for `/api/*` and registration/recovery, starting in logging mode on an agreed release window. WAF settings affect live traffic; they **were not changed by these commits**. See https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting.
- Add alarms and spend caps with the AI provider. Counting requests alone is not a monetary budget: prices vary by model, tokens, audio length and retries.
- Configure and verify `NE_SESSION_SECRET` (strong random secret) and OpenAI credentials via Vercel secret configuration. Never store secrets in GitHub code or logs.
- Enable Supabase breached-password protection if available for this project's plan; the security advisor previously indicated it was off. This requires a separate live Auth configuration change.
- Re-run Supabase Security Advisors and inspect function grants, especially `ne_sync_v2` and `ne_ai_quota_check`. No accidental anonymous `SECURITY DEFINER` executions.

## Privacy and legal sign-off (not a legal certification)
Before public accounts: verify controller identity and contact channel; lawful bases and purposes; actual retention/deletion schedule for login credentials, audio, transcripts, learning progress, feedback and error logs; data subject access/export/correction/deletion flow; vendor data processor agreements; cross-border transfers and sub-processors (Vercel, Supabase, AI service); incident response; cancellation/refund and subscription disclosures, where applicable. Do not imply that uninstalling the app automatically erases cloud data.

Official Norway guidance:
- Datatilsynet: https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/hvordan-lage-en-databehandleravtale/
- Datatilsynet: https://www.datatilsynet.no/
- Forbrukertilsynet: https://www.forbrukertilsynet.no/

## User data recovery
- The current app already provides JSON export/import, separate from cloud sync.
- 8.2 now offers **explicit cloud-copy deletion**, keeping local progress until users choose to delete local files.
- New 8.2 restore validates JSON structure and enforces a file size limit. Real device testing and a two-account data migration rehearsal remain mandatory.
- The app has no verified end-to-end self-service deletion of *all account data*; this requires a documented and tested retention/deletion workflow before mass registration.

## Public launch: NO-GO until
- Successful tests for final branch SHA, Android and Preview.
- Clone rehearsal and authorized migration/cutover (including rollback).
- WAF and AI spend guards in live environments.
- Supabase Auth security advisor remediation and accounts/access regression.
- GDPR transparency and data deletion/export processes reviewed against actual vendor terms.
- Explicit separate owner instruction to release.

**No production change is authorized by this document.**
