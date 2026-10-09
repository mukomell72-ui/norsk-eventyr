# Norsk Eventyr 8.1 — acceptance gates before any real release

**Status:** private beta. Nothing may be merged into `main` or promoted to Vercel Production/Google Play without the owner's separate consent.

## Essential technical gates (must pass)
- Full CI suite: API access guards, SQL entitlements/RLS, cloud merge, user-scoped sessions, recovery, update lifecycle, 36 viewport-route combinations, adaptive gates, curated scenarios, microphone provenance.
- Two isolated accounts on one browser/phone: Nora's previous meeting, current task, spoken/written attempts, review schedule and payment status cannot carry over.
- Three interruptions: (1) halfway through introductory dialogue, (2) halfway through vocabulary, (3) halfway through writing correction. Resume exactly without XP duplication or loss.
- First attempt correctness must be recorded separately from an answer reached after a hint.
- A speech answer entered as text must count **only as writing**, not speaking, even if the task appears under a speaking heading. AI cannot certify official CEFR.
- New A1/A2 students: use original 16 structured foundations; incomplete or unavailable AI must never award a made-up passing grade.
- Returning students: Nora must not reintroduce herself. Different users have separate memories and modules.
- Test real Android: install signed debug APK, login, permission denial/approval, Norwegian microphone transcription, audio replay and slow mode, app suspend/resume, device rotation, accessibility, update with saved progress. **Not verified in CI alone.**
- Test AI timeouts and actual Norwegian text/audio content manually with speakers and professional review; synthesized TTS is not labelled human.

## Learning outcomes (not yet evidenced by software tests)
- Independent pre-test at day 0 and new independent tasks at days 7, 30, and 90; no repeated phrases between training and post-test; hold practice time constant.
- Observe actual completion of practical tasks (booking appointment, understanding supervisor, composing a message), not number of taps/XP or only multiple choice.
- Independent human rating of free speaking/writing on a consistent rubric, ideally blinded to the training condition; compare to conventional instruction/another app at comparable starting level and practice duration.
- Report change by listening, reading, writing and speaking separately with dropouts, missing data and confidence intervals; describe the sample and limitations. Do **not** claim B2 certification or top competitor performance without evidence.

## Pedagogical peer review
- For each A1/A2 lesson: natural Bokmål, target-level vocabulary, realistic comprehension distractors, unambiguous answer key, one main learning objective, practical transfer, proper grammar rule and non-sensitive everyday context.
- For B1/B2: professional review and sufficient original material are pending; an AI-generated blueprint is NOT equivalent to a complete accredited B2 course.
- Genuine human audio is pending consent, recording quality and usage rights. Synthetic Norwegian speech and ASR require real device checks.

## Owner's private test plan (about 20 minutes)
1. Create one fresh account; open the main learning action, complete half the task; leave and re-enter.
2. Complete comprehension after audio **without visible transcript**; try both speeds. Give one wrong answer before choosing the correct one and verify that the first failed attempt is not scored as 100%.
3. Try speaking by microphone, then by typing. Confirm that typing does **not** raise speaking mastery.
4. Start another conversation; Nora must remember you have met. Return next day for review.
5. Switch to a second test user; verify the first user's private memory, progress, and profile are absent.
6. Open every main route on a phone and record clipped text, unclear controls, feedback errors and confusing navigation.

## Limits and release criteria
Automated code tests alone cannot guarantee an error-free app, successful language acquisition, production capacity, a working subscription payment system, or Android compatibility. Those require additional evidence. Report all failures and unresolved items before proposing release.
