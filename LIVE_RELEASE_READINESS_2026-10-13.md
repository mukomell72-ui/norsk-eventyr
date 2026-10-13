# Norsk Eventyr 8.3.0 — live release readiness (read-only check, 13.10.2026)

**Scope:** infrastructure configuration and database function metadata inspected without changing production, running DDL, modifying secrets or reviewing personal learner records. This is NOT a security certification or approval for public launch.

## Observed release facts
- 8.3.0 candidate is a separate draft PR #54; the production main site remains on 8.2.9. Latest successful staging QA previously passed for commit c655171736b4099970ca70fbc9d5baacc685fca2, and the matching Vercel Preview was READY. **New staging commits require a new green CI and Preview for their exact SHA.**
- Vercel environment-variable **metadata** confirms NE_SESSION_SECRET is configured for production and preview, and OPENAI_API_KEY and NE_LEGAL_CONTROLLER_NAME entries exist. Values were NOT decrypted or validated. NE_DISTRIBUTED_QUOTA and NE_SYNC_V2_ENFORCE are listed only as preview flags scoped to an older feature branch. The code in api/_guard.js and api/cloud.js explicitly enforces distributed quota and account-bound sync whenever VERCEL_ENV is production.
- Supabase migration history includes ne_8_2_prepare_distributed_ai_quota and ne_8_2_prepare_account_bound_cloud_sync. A read-only query of the Norsk Eventyr database confirms public.ne_ai_quota_check and public.ne_sync_v2 exist, deny execute to anon and permit execute to authenticated. **Existence/permissions are not proof of correct end-to-end performance or capacity.**
- Four legacy bearer-secret RPCs (norsk_eventyr_sync_create, norsk_eventyr_sync_pull, norsk_eventyr_sync_push, norsk_eventyr_sync_delete) still permit anon EXECUTE. These functions use a secret; their permission alone does NOT prove unauthenticated access to learner content. The historical-compatibility direct RPC surface remains open. The staged cutover SQL has **not** been executed. Revoking these permissions without confirming that no old clients need them may break recovery. Requires a tested backup, two-account rehearsal, rollback plan and explicit owner-approved maintenance window.
- Supabase Security Advisors reports auth_leaked_password_protection is disabled. Review whether it can be enabled for the account/plan before mass registration: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Other Supabase WARN findings include exposed SECURITY DEFINER RPCs. These may be intentionally protected by code; review each affected function rather than automatically changing EXECUTE grants or RLS policies. An INFO lint for RLS enabled without policies on app tables may be intentional (RPC-only design).
- A Vercel active Firewall config query returned 404 "Seawall Config not found"; no rate limiting rule can be verified from this. Check /api/ protections, logging-mode rate limits and alerts in the actual project dashboard. https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- AI provider monetary spend caps/alert policies were not verified. The existence of an hourly-request counter is not a money-spend cap.
- Complete account deletion, actual retention of audio/transcripts/feedback and GDPR notices have not been independently verified. Partial cloud-copy deletion is not complete account erasure.
- 32 authored modules and 72 synthetic-speech scripts are in the candidate, but independent Bokmål editorial signoff and real licensed human voice recordings are NOT documented. Do not claim officially validated B2 or CEFR certification.

## Strict release decision
**Internal/closed beta preparation:** Candidate can move toward controlled pilot only after real Android 8.3 smoke tests, new same-SHA green CI/READY Preview and explicit acceptance of limited rollout costs and risk.
**Mass public launch — NO-GO:** Await verified WAF, AI spend controls, Auth leaked-password protection plan, production/clone data recovery and legacy cutover plan, GDPR retention/erasure review and professional language/content review.

## Safe function privilege recheck — SELECT only
SQL below is read-only and returns function metadata, not user data:

```sql
select p.proname as function_name,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_exec
from pg_proc p
join pg_namespace n on p.pronamespace=n.oid
where n.nspname='public'
  and p.proname in ('ne_ai_quota_check','ne_sync_v2',
                   'norsk_eventyr_sync_create','norsk_eventyr_sync_pull',
                   'norsk_eventyr_sync_push','norsk_eventyr_sync_delete')
order by p.proname;
```

**Current:** the four legacy functions return anon=true; the new two return anon=false, authenticated=true.
**After separately approved cutover:** legacy anon=false and authenticated=false, while new functions remain authenticated=true. NEVER execute migration/revocation from an informational audit.

## Responsibilities not completed by software build
- Real Android tests: ANDROID_8_3_0_ACCEPTANCE.md
- GDPR/incident/account erasure, backup and rollback: SECURITY_RELEASE_PLAN_8_2.md
- Expert lesson/voice review: research/EDITORIAL_AUDIO_AND_STUDY_PROTOCOL.md
- Final staging candidate: RELEASE_8_3_0_STAGING.md
- Dangerous, intentionally unapplied SQL: deferred/SECURITY_8_2_SYNC_CUTOVER.sql

No production changes were authorized by this check. Never report "all approved" on the basis of a green CI or this report.
