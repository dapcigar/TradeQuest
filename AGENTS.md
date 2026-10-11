# TradeQuest Agent Instructions

## Product invariants
- Free learning product; no paywall dependency.
- No live market feeds in MVP.
- Historical data only when licence rights are confirmed; label synthetic scenarios clearly.
- No real-money execution, broker connection, trading signals, or personalised financial advice.
- Risk management and learning quality outrank simulated profit and engagement.
- AI-assisted content is a draft until automated validation and human editorial approval pass.
- Do not expose future candles before replay reveals them.
- Account-owned data must be isolated; never expose private balances, journals or progress publicly.
- Desktop and mobile are equal priorities; honour keyboard, screen-reader, contrast and reduced-motion needs.
- Do not overwrite existing work or claim tests passed unless they were run.

## Task workflow
1. Inspect repository state and relevant files before editing.
2. Read docs/IMPLEMENTATION_BRIEF.md and task-relevant specs.
3. State scope, risks, acceptance criteria and tests.
4. Make a bounded change with minimal unrelated refactoring.
5. Run targeted tests, typecheck, lint and build as available.
6. Review security, accessibility, educational correctness and responsive behaviour.
7. Update docs and provide an honest handover.
8. Persist handover before using /clear or equivalent. Reload this file and only task-relevant context afterwards. Context reset does not reset usage limits.

## Done means
- Acceptance criteria have evidence.
- Tests cover expected and failure paths.
- No dead controls or fake data presented as real.
- No secrets, silent assumptions, unrelated changes, or unexplained dependencies.
- Known limitations and unrun tests are clearly reported.

## Task handover format
Task:
Scope:
Files changed:
Acceptance criteria:
Tests run and results:
Security/accessibility review:
Known limitations:
Database/config changes:
Commit:
Next task:
