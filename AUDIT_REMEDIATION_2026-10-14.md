# Norsk Eventyr — remediation register after strict audit (14 October 2026)

**Scope:** evidence-based audit of the 8.3.0 lesson6 production baseline, followed by fixes on a **separate draft branch**. This document does not authorize merging or deploying.

## A. Defects corrected in this branch

1. **False delayed transfer (corrected in `course-methodology.js`).** Previously, the final course phase only checked whether the module's `startedOn` was a past date. A learner could pass the preceding productive phase and the final transfer phase on the same date after beginning the module earlier. The corrected gate records `courseV2.lastPassedAt` whenever a stage is passed, and transfer requires a later local calendar date than that evidence. For existing incomplete chapters without a verifiable prior pass timestamp, it records a conservative transfer baseline, requiring another day. Completed historical chapters and prior stages are retained.
2. **Fresh learner high-score bypass (corrected in `adaptive-teacher.js`).** A newly created chapter could reach 78+ by accumulating quiz scores across six skills before activating the structured course, then be treated as legacy mastery. New curriculum chapter state now starts with `courseV2` immediately. Already-existing saved modules remain as originally mastered. Dedicated regression test checks that even high quiz scores cannot skip four stages.
3. **Stale release labels (corrected in HTML/settings).** Settings and HTML description said 8.2 despite installed 8.3.0. Labels were synchronized.
4. **PWA patch coherency (revised to `8.3.0-lesson7`).** HTML, cache manifest, bootstrapped scripts and integration assertions share an explicit patch revision, without changing the persisted APP_VERSION or deleting user data.

**Verification:** exact-commit automated `npm test`, Chromium regressions, Vercel Preview and a real Android acceptance remain mandatory. A green test is evidence only of the tested scenarios, not of CEFR proficiency or hardware performance.

## B. OPEN blockers — not solved by software claims

### Security and privacy (priority P0)

- Read-only Supabase audit showed legacy `norsk_eventyr_sync_{create,pull,push,delete}` functions still executable by `anon`. The RPCs use a separate secret, so this privilege by itself is **not** proof of unauthorized disclosure; nevertheless it expands the direct-call surface.
- Existing production backend uses authenticated sync v2, but revoking old RPC privileges may strand historic clients/backups. Before applying `deferred/SECURITY_8_2_SYNC_CUTOVER.sql`: verify database restore, rehearse with two accounts on a clone, check clients and rollback, obtain owner approval for a maintenance window, then re-check `pg_proc` grants. **No live grants are changed by this code PR.**
- Supabase Security Advisors show `auth_leaked_password_protection` disabled and WARN about exposed SECURITY DEFINER functions; each requires review, least-privilege scope and post-fix retesting. Do not indiscriminately revoke unrelated functions from a shared project.
- Complete account erasure, retention of audio, transcriptions, service provider data flows, and real AI spend protection need operational verification.

### Educational quality (priority P1)

- 32 curriculum modules and 72 **synthetic-speech text scripts** exist, but their expert Bokmål approvals are undocumented. Review every lesson with qualified external teachers using signed item/version tracking before claiming professional verification.
- Historical FSI recordings play; the 13-resource directory links to university/official sources and CC0 research archives. Links are **not** an integrated and reviewed corpus of human recordings. Clip selection, rights checks, per-clip transcripts and learner difficulty calibration remain necessary.
- Neither independent human two-rater scoring nor a controlled learner-outcomes evaluation has been run. AI practice scores must not be represented as official CEFR or Norskprøven grades. The 600h A1–B2 timetable is an unvalidated planning scenario.

### Field acceptance (priority P1)

- Test the current branch on physical Android: microphone permissions, actual sound, PWA offline to online transition, cloud sync and restore, long sessions, AI failures, and preservation of progress across upgrade. Use `ANDROID_8_3_0_ACCEPTANCE.md`. Browser simulations alone are insufficient.

## C. Required sign-off before publishing

1. All mandatory GitHub Actions tests pass on final branch SHA; same-SHA Vercel preview is READY.
2. Owner tests on a real phone and confirms access, audio, speaking, lesson transfer on successive dates and data preservation.
3. Separate security release owner explicitly approves and executes a controlled DB cutover, or release is limited to controlled pilot while residual risks are documented.
4. No claims of independent certification, native-audio expansion or learning-outcome superiority until supporting evidence exists.

**Production boundary:** This branch is a proposed correction only. Do not merge into `main` or publish without a later explicit authorization.
