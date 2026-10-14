# Norsk Eventyr: evidence-gated course progression and five-part study day

Status: draft branch only — **not merged or deployed to production**.

## Competitive feature comparison (official vendor descriptions, retrieved 2026-10-14)
- Babbel: linguist-authored short scenario lessons, speaking recognition, spaced repetition.
  https://www.babbel.com/how-babbel-works
- LingQ Norwegian: large native audio/transcript corpus, importing personal content.
  https://www.lingq.com/en/learn-norwegian-online/
- Memrise Norwegian: native-speaker videos and AI scenario conversation.
  https://www.memrise.com/en/learn-norwegian/norwegian-course
- Duolingo: interactive Adventures and carefully designed AI speaking experiences; **availability varies by course**.
  https://blog.duolingo.com/adventures/
  https://blog.duolingo.com/ai-and-video-call/

## Built on this branch
- **Evidence-gated progression.** All four curriculum phases now require a relevant completed session with actual graded responses. Intro requires ≥3 skills; comprehension requires both listening and reading; autonomous production requires graded writing *and verified microphone speaking*; transfer requires original writing and speaking on a later date (with new-scene transfer labels). Ordinary quiz percentages and repeated same-day sessions cannot skip these phases.
- **Legacy-safe progression.** Chapters already mastered under the previous system retain their score and path. Only newly begun or incomplete teaching chapters activate the verified course process.
- **Explanatory outcomes.** Every chapter completion reports whether this stage advanced and why. Course overview displays verified stages.
- **Daily learning route.** A real five-part checklist routes to vocabulary/spaced review, Nora's structured lesson, authentic-audio library, conversation and dictation. The time allocation comes from each learner's daily target. Clear wording separates **planned minutes** from **actually studied minutes**.
- **Honest real-audio activity.** Playing a historical FSI public-domain audio track until the end marks a listening *practice* activity; it does not claim comprehension or CEFR readiness.
- **Regression tests.** Technical stage-by-stage checks include written-versus-spoken input, early transfer, preserved legacy progress and integration with existing features.

## Not implemented / claims we must not make
- We **cannot** honestly call Norsk Eventyr equal to Duolingo, Babbel, LingQ or Memrise without independent user studies, repeated A/B tests and a broad native-speaker corpus.
- This branch does not introduce native-speaker recording production, licensed premium audio, a full externally reviewed B1/B2 syllabus, verified phoneme-level pronunciation scoring or user retention data.
- The app is not a substitute for teacher-led oral assessment or Norskprøven.
- Live Android field testing with microphone permission, offline PWA and intermittent network remains necessary.
- No authorization to publish this branch is inferred from earlier publication of PR #60.
