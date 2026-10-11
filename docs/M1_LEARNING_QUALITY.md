# M1 Learning Quality — First Hardening Pass

## Scope
This pass hardens demo progress handling and prevents repeat XP farming for the chart-dojo scenario. It does not implement authentication, server-side authority, cross-device sync, or a full mastery engine.

## Changes
- Parse local progress as untrusted data and normalise field types.
- Cap demo XP and the number of stored action identifiers.
- Extract deterministic progress normalisation and one-time XP award logic into a tested module.
- Use a stable scenario action ID so navigating away and returning does not award the same scenario XP repeatedly.
- Add tests for malformed progress, invalid values, action ID deduplication and idempotent awards.

## Acceptance criteria
- Malformed JSON falls back to safe defaults.
- Unexpected field types are not trusted.
- Duplicate scenario award requests do not increment XP.
- XP cannot grow without bound from corrupted local storage.
- New pure logic has unit tests.

## Remaining limitations
- Browser local storage is editable by the learner and is not authoritative.
- Progress is not tied to a signed-in account or synced across devices.
- The demo scenario is static and has no server-authoritative attempt record.
- The current component-level lesson/quiz/risk XP paths still depend on local state; production XP must be awarded transactionally by a server.
- CI status must be confirmed on GitHub before claiming test/build success.
