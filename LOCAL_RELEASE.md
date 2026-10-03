# Norsk Eventyr 7.2 — local release candidate

Publication authorized by the user on 2026-10-03: «объединять исправления, проверять их локально и публиковать одним обновлением». Consolidated 7.2 release; production status is verified separately after deployment.

## Included

- All earlier local changes: five-turn introduction, specific Ingrid language-cafe idea, general questions in help, searchable learned vocabulary, simple homework, microphone stream reuse and contextual word translation.
- New scene assets and mobile interface based on the user's approved 12-screen concept. Image provenance and prompt descriptions are in assets/SOURCES.md.
- Distinct place conversations and topic selection, separate persistent conversation histories, recent dialogue plus early conversation context sent to the assistant.
- Grammar explanations and practice at A1–B2; mistake retry and automatic progression after correct answers in grammar, dictation and listening comprehension.
- Search, favorites, manual word addition and vocabulary review priority. Saved state survives page reload.
- All core lessons available through the full lesson list. Four working exam-part controls and a full practice test entry.
- Profile preferences, voice toggle, existing cloud workflow, progress export and a welcome screen.
- Updated application, manifest and health version 7.2.0; service worker caches the new local scene assets and scripts.

## Verification performed

- JavaScript syntax and git whitespace checks passed.
- DOM audit: 20 routes and 370 inline actions; duplicate chat submission protection and help preserve learner input.
- Chromium interaction audit: correct/wrong answer flow, five dialogue turns, microphone recordings and stream reuse, navigation during delayed responses, translation dialog, SRS and task priority, vocabulary persistence, favorite filters, all exam-part controls and profile preference writes.
- Separate histories and scenario requests tested for six locations. API contract checked with a mocked AI response, including recent messages and early conversation memory.
- Every core lesson accessible at A1, A2, B1 and B2.
- Twelve concept screens checked at widths 360, 390 and 768 px without horizontal overflow.

## Verification boundaries

AI, transcription and microphone hardware were mocked in the browser interaction checks. Actual AI response quality, real Android microphone behavior and real cloud synchronization have not been validated by these local tests. Existing external human-course recordings remain in Listening Lab; Nora's voice is synthetic. The new visual character and town are fictional generated assets. There is no new email/password authentication; the welcome screen links to the existing progress synchronization flow.
