# Norsk Eventyr — quality stabilization plan
Date: 25 October 2026. This is an engineering checklist, **not evidence of effectiveness**.

## What can be repaired now

1. **Evidence and spaced-review agreement (this draft):** A successful independently recalled translation closes an immediate review request and schedules the next delayed review. A forgotten word existing only in a previous day's snapshot is entered into the persistent dictionary and SRS without granting XP or mastery. Repeated taps are idempotent. Tests assert the behavior.
2. **Reliable evaluation:** Keep the guarded AI grading rule: unsupported comments never create a score. Future work: bounded diagnostics for each failure code, regression corpus for real learner replies, independent linguistic review of the rubric, and human-readable retry failure feedback. Never assume a CI pass proves a correct AI judgment.
3. **One teaching flow:** Connect lessons, word trays, self-assessment, SRS, generated dialogues and free responses through the same learner-scoped evidence. Prioritize independence (free response), delayed retention and contextual reuse over tap statistics.
4. **Pedagogical variety:** Enforce module-level objectives and increasing answer complexity only after demonstrated readiness; avoid dumping all 15 words into each task. Add test cases for longer natural stories at A2/B1/B2.
5. **Production quality:** Version the offline cache for each release, run the full CI suite, verify the exact Vercel production commit and aliases, then conduct manual Android checks for PWA caching, voice, navigation and recovery of an unfinished draft.

## Measurable release criteria

- **Grade reliability:** No unsupported or invented point deductions in a fixed curated evaluation dataset; track unverified-grading rate, reasons, and verified retry recovery.
- **Learner progress:** No XP, CEFR gate, or SRS mastery from revealing a translation. A demonstrated recall must close the stale due-now request while a new due date is scheduled.
- **Retention:** Compare correct independent production after 1, 3, 7 and 14 days with the learner's earlier independent production, not with vocabulary exposure counts.
- **Session continuity:** No answer draft leaking into another question; in-progress writing survives refresh and network failure. A repeat check cannot overwrite original XP evidence.
- **Mobile:** No horizontal page overflow, accessible controls, validated offline cache and voice fallback.
- **Effectiveness:** Improvement should be measured using equivalent holdout tasks rated by independent reviewers; the app's own AI scores are insufficient as proof.

## Boundaries

No claim of complete CEFR validation, a flawless AI tutor, or superiority to other products. **Do not publish this draft or change production without separate explicit user approval.**
