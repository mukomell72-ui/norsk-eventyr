# Norsk Eventyr 8.0.0 — Adaptive Mastery Teacher

Date: 2026-10-06

## Release purpose

Norsk Eventyr 8.0.0 replaces the old lesson-completion model with an adaptive mastery path from A1 through B2.

The release does **not** promise that every learner will reach B2, and it does not present internal scores as an official Norskprøven result. The application is designed to collect stronger evidence of language ability and to adapt practice to the learner's actual weak points.

## Learning system

### 32-module A1–B2 curriculum

The main course contains:
- 8 A1 modules;
- 8 A2 modules;
- 8 B1 modules;
- 8 B2 modules.

Each module has practical can-do goals, grammar focus, lexical field and real-life contexts.

Legacy lessons and AI topics remain available as additional practice, but they do not by themselves mark a CEFR level as complete.

### Separate mastery profiles

The learner is tracked separately for:
- listening;
- reading;
- writing;
- speaking;
- grammar;
- vocabulary.

Profiles are also separated by CEFR level. Strong reading at A2 cannot hide weak A2 speaking, and A1 evidence cannot automatically count as A2 evidence.

### Mastery gates

A level is not considered internally complete because a lesson was opened or a single test was passed.

The gate requires:
- broad evidence across the six components;
- minimum performance across the four communicative skills;
- module mastery;
- transfer/capstone performance;
- delayed retention evidence across listening, reading, writing and speaking.

Delayed retention evidence is only created by a review that was actually due. Repeating correct answers immediately on the same day cannot manufacture retention credit.

### Spaced review

Adaptive review uses intervals:
- 1 day;
- 3 days;
- 7 days;
- 14 days;
- 30 days;
- 60 days.

Due reviews retain the CEFR level where the original evidence was created.

### Adaptive teacher Nora

Nora receives:
- current level-specific mastery;
- weak skills;
- recurring error patterns;
- review vocabulary;
- module can-do goal;
- grammar and lexical focus.

Generated lessons contain:
- practical language goal;
- active vocabulary recall;
- grammar application;
- comprehension-based listening;
- reading;
- writing;
- speaking.

The AI evaluator returns targeted correction, a short rule, concrete strengths/improvements and a retry prompt. Internal AI estimates are learning evidence only, not official certification.

### Active vocabulary recall

Adaptive lessons require the learner to type Norwegian words/expressions from memory instead of only recognizing the correct answer among choices.

### Listening comprehension

Adaptive listening uses a separate Norwegian audio passage and a meaning/detail question. It must not merely ask the learner to select the exact sentence that was played.

### Placement and diagnostics

The initial placement is a **starting-point screening**, not CEFR certification.

It samples receptive/structural skills and may recommend starting material at A1, A2, B1 or B2. Writing and speaking are not invented from the placement result; Nora collects evidence from real productive answers.

Starting a level diagnostic does not switch the active course level.

Browsing a higher course tab also does not change the active course. A learner can inspect higher material, but higher mandatory modules remain gated unless the placement start or lower-level mastery permits them.

### Conversation integration

Scored Nora conversation turns can contribute valid writing/speaking evidence when the server returns a validated score. Conversation level selection is independent of the active course level.

## UI

The active Course screen uses the 32-module adaptive curriculum.

The Today screen prioritizes:
1. the main adaptive Nora session;
2. only review that is actually due.

Extra modes remain available for optional practice instead of being presented as a mandatory daily checklist.

Progress screens distinguish:
- course-route completion;
- actual mastery evidence.

## Versioning and PWA

Runtime version: **8.0.0**.

The service-worker cache namespace and public asset versioning are aligned to 8.0.0 so installed clients can distinguish this release from 7.4.0.

## Account / growth / owner dashboard

8.0.0 includes the unpublished 7.4.0 account/growth/admin work:
- 5-day trial foundation;
- referral attribution and bonus foundation;
- email-confirm lifecycle;
- install/activity tracking;
- purchase-interest signal;
- public ratings/comments with moderation;
- responsive owner dashboard;
- per-user lifecycle;
- payment/subscription ledgers prepared for trusted server integration;
- owner-only backup/error/admin views.

## Payment limitation

8.0.0 does **not** implement live card charging.

Payment/subscription tables are infrastructure for future trusted server/webhook integration. Browser users cannot directly write paid state. Norsk Eventyr does not store card numbers.

Do not describe 8.0.0 as having live payments until a verified payment provider integration is released.

## Privacy / owner identity

The owner's personal identity is not hardcoded into normal public UI/current tracked application source.

Legal controller identity is loaded from protected server configuration only when the legal/privacy disclosure needs it.

The current Git history may still contain historic metadata/old values from earlier commits; 8.0.0 does not rewrite public Git history.

## Vercel configuration

Required protected variables:
- `NE_LEGAL_CONTROLLER_NAME`;
- `OPENAI_API_KEY`.

Both must be available to:
- production;
- preview.

Never print or commit their values.

## Database preflight

Production Supabase is already prepared for 8.0.0.

The confirmed owner Auth account already has:

`raw_app_meta_data.ne_owner=true`

Do not commit the owner's email, Auth UUID or another personal identifier.

## Production database state — verify only

The following release migrations are **already applied and verified in production**:

1. `migrations/20261005_growth_funnel.sql`
2. `migrations/20261005_admin_lifecycle.sql`
3. `migrations/20261006_internal_trigger_rpc_hardening.sql`

**Do not re-apply them during publication.** The release step is verification only:
- verify owner authorization and lifecycle/growth RPCs;
- verify private payment/subscription tables and owner RPCs;
- verify internal lifecycle trigger functions are not executable by PUBLIC/anon/authenticated.

Do **not** apply:

`deferred/20261005_privacy_v3_finalize.sql`

during the initial 8.0.0 release.

The growth/admin lifecycle state and trigger RPC hardening were already applied and checked in production before the final frontend gate.

## Known security-advisor items

Supabase currently reports:
- leaked-password protection disabled;
- SECURITY DEFINER warnings for legacy cloud-sync RPCs.

The cloud-sync functions were checked to confirm they reference their own sync-secret verification logic and use a fixed search_path. They remain a separate hardening area and are not newly introduced by 8.0.0.

Leaked-password protection should be enabled when supported/appropriate for the project.

## Release gates

8.0.0 may be published only when all of the following are true:

1. PR #32 head SHA is re-read immediately before release and has not changed after verification.
2. Full GitHub QA for that exact SHA is SUCCESS.
3. A Vercel Preview exists for that exact SHA and is READY.
4. Preview has the required protected AI/legal environment variables.
5. Real Preview smoke-test passes:
   - app/access;
   - Nora adaptive teacher;
   - generated lesson;
   - active vocabulary recall;
   - listening comprehension;
   - writing evaluation;
   - speaking flow/evaluation where browser support permits;
   - spaced review;
   - course map/gating;
   - no blocking console/runtime errors.
6. Owner `raw_app_meta_data.ne_owner=true` remains set and verified.
7. Already-applied growth state is re-verified; migration is **not** re-applied.
8. Already-applied admin lifecycle state is re-verified; migration is **not** re-applied.
9. Already-applied internal trigger RPC hardening is re-verified; migration is **not** re-applied.
10. PR #32 is merged from the exact verified head.
11. Vercel production deployment is READY.
12. Production smoke-test passes.

If any gate fails, stop before the next irreversible/public step and report the blocker. Do not bypass a failed Preview or migration verification.

## Current production baseline before release

Production must remain on the verified 7.3.8 baseline until the release gates above pass.

## Rollback

The release migrations are additive. If application code must be rolled back after database migration, do not drop the additive tables/columns as part of the immediate application rollback.

Prefer:
- restore/promote the previous known-good production deployment;
- retain additive DB structures;
- investigate before destructive database rollback.

## Publication authorization

Do not merge/publish only because this document exists. Production publication still follows the user's explicit release authorization and the release gates above.
