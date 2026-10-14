# Norsk Eventyr 8.3.0 lesson6 — release candidate (14 October 2026)

**Target:** verified-core teaching progression + authentic source directory + external outcome audit.

**Publication status:** NOT PUBLISHED. PR #61 remains separate from `main` and Vercel Production. User requested preparation, not publication.

## User-visible changes
- 4 evidence-gated learning phases for newly started / incomplete A1–B2 modules; no skipped phases based on repetitive answers.
- Require audio comprehension and reading evidence, actual microphone speaking and independent writing, followed by a later-day contextual transfer.
- Retain existing mastered modules and previously saved progress.
- Daily 5-part study plan: spaced repetition, teacher lesson, listening, conversation and dictation. The displayed minutes are a *plan*, not an activity timer.
- 13 institutional source catalogue entries, filtered by A1–B2, with rights explicitly tagged.
- NTNU courses and HK-dir official exam guidance remain **external links**. Audio corpora marked CC0 are **research archives**, not new in-app licensed lesson audio. Historical FSI audio clips continue to play as before.
- Independent **offline** audit of anonymized two-human-rater study results; no actual external learner outcomes have been collected.

## Pre-release gates
1. `npm ci && npm test` in `tests` must pass for the exact PR commit (full release, PWA, Android-web microphone simulation and browser QA).
2. Vercel Preview for **same SHA** must be `READY`; intended Git project = `mukomell72-ui/norsk-eventyr`, target project = `norsk-eventyr-mvp`.
3. PR must have no merge conflict with `main` and no new sensitive files, migrations, copied copyrighted NTNU media or undocumented licensed recordings.
4. GitHub Actions generates source ZIP from PR head SHA after QA, plus SHA-256 and a machine-readable manifest. This archive is **not a deployment**.
5. **Manual owner acceptance before release:** open on actual Android phone, verify sign-in/permissions, TTS, microphone voice-vs-typed evidence, 5-part daily route, PWA update, cloud sync (if configured), all 13 official links, offline/online transition and progress preservation.
6. Review app's presentation of official Norskprøven: **training only**, not certification. Independent outcomes / teacher validations are **not** claimed.

## Release procedure (requires a NEW explicit owner instruction: «Публикуй»)
1. Verify SHA and successful QA again; if branch changes, repeat all checks.
2. Document owner approval of exact changes. Merge PR #61 into `main` only after approval.
3. Wait for Vercel Git-connected **Production** build from merged `main` SHA; verify `READY` and alias `norsk-eventyr-mvp.vercel.app`.
4. Smoke test production UI, remote source links, permissions and critical /api/health endpoint; check errors if permitted.
5. If an issue arises, do not falsely mark it resolved; prioritize correcting or reverting the production merge.

## Rollback
- Confirm prior working `main` commit and production deployment prior to merge.
- If release breaks users, revert the PR merge in GitHub and wait for the reverted `main` commit to redeploy. Verify the production domain points to the reverted version.
- Preserve learner data; this candidate includes no schema migrations and introduces optional fields only. The old app may ignore new `courseV2` fields.
- A Vercel rollback/promotion requires explicit approval and exact production IDs; it is not performed while preparing a release.

## Explicit non-claims
- CEFR/Norskprøven official level validation: NOT DONE.
- Human-edited audio clips from the new CC0 corpora, packaged into the course: NOT DONE.
- Two qualified external reviewers independently approving each A1–B2 lesson: NOT DONE.
- Independent learner impact study, controlled comparison with industry leaders: NOT DONE.
- Physical Android, offline and microphone lab sign-off by a real test user: **NOT DONE** until manually confirmed.

**Honesty threshold:** technical readiness after QA is not professional pedagogical validation. This release publishes a better workflow and source directory; it must not be advertised as a completed university-approved curriculum.
