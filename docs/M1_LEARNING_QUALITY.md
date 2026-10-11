# M1 Learning Quality — Hardening Passes

## Scope
Improve the first learning slice and harden demo progress. This remains a frontend prototype; it does not implement authentication, server-authoritative XP, account sync or a full mastery engine.

## Progress safety
- Parse local progress as untrusted input and normalise field types.
- Cap demo XP and the number of stored action identifiers.
- Extract deterministic progress normalisation and one-time XP award logic into a tested module.
- Use a stable scenario action ID so navigating away and returning does not award the same chart-dojo scenario XP repeatedly.
- Test malformed progress, invalid values, action ID deduplication and idempotent awards.

## Learning interaction quality
- Submit knowledge-check feedback only after the learner checks an answer; changing an answer clears submitted feedback.
- Distinguish the spread from commission and leverage with answer-specific explanations.
- Mark lessons that have not been implemented as unavailable rather than pretending they can be previewed.
- Extract answer evaluation into pure logic and test correct, incorrect, unanswered and unexpected values.

## Acceptance criteria
- Malformed saved data safely falls back to defaults.
- Unexpected field types are not trusted.
- Repeating the same scenario action ID does not increment XP twice.
- Knowledge-check feedback does not appear before submission.
- Incorrect answers have a clear retry path and explanatory feedback.
- Unimplemented lessons are visibly disabled.
- New pure logic has unit tests.

## Remaining limitations
- Browser local storage is editable by the learner and is not authoritative.
- Progress is not tied to a signed-in account or synced across devices.
- The demo scenario is static and has no server-authoritative attempt record.
- The current lesson/quiz/risk XP paths are still prototype-level; production XP must be awarded transactionally by a server.
- CI must run successfully on GitHub before changes are treated as verified.
