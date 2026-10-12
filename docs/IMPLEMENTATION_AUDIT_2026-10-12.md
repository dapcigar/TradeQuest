# TradeQuest Implementation Audit — 12 October 2026

## Executive status

TradeQuest has a working React/Vite/TypeScript learner experience, a Node/Express API, Supabase Auth/Postgres persistence, server-scored learning attempts, evidence-based review recommendations, private decision journals, weekly practice plans, and a synthetic paper-trading lab.

**Status: active MVP development, not production-ready.** Unit tests/build/preflight are passing on the recent merged feature PRs, but a passing CI run is not proof that the latest Supabase migrations have been applied, two-account isolation has been exercised against the connected Supabase environment, browser journeys have passed, or a deployment succeeded.

## Latest merged implementation phases

| PR | Status | Delivered |
|---|---|---|
| #82 | Merged | Read-only API smoke command checks health identity, defensive headers, and unauthenticated rejection on selected learner endpoints. |
| #83 | Merged | Private append-only simulated entry/exit fills; database triggers create fills with session start/closure; existing sessions are backfilled; API/UI/export integration and tests added. |
| #84 | Merged | Signed-in overview uses account-backed lesson completion, XP, and risk-tool evidence rather than browser-local demo state. |
| #85 | Merged | Solo challenge cards show process rubrics and the latest result from linked synthetic scenarios; results are not based on P/L. |
| #86 | Merged | Chart Dojo interactive history remains capped at 500 records for responsive UI; the mastery and adaptive recommendation APIs now page through all retained relevant attempts. |

For each of these PRs, GitHub Actions passed npm run test, npm run build, npm run api:build, and npm run release:preflight before merge.

## Implemented foundations

- Anonymous demo activity is kept separate from account-backed activity.
- Signed-in Chart Dojo and Adaptive Practice use server-scored attempts and server-provided feedback; answer keys are not sent to the client.
- The review queue is based on server-stored practice evidence and labels limited evidence conservatively.
- Learner-owned weekly plans, decision journal entries, paper-trade sessions, session transition events, and simulated fills are persisted and included in account export/deletion flows as documented.
- Replay cursor tokens are signed and learner-bound; replay returns one synthetic candle per request.
- Paper Trade Lab uses server-authoritative candle advancement and version checks, with an append-only session transition history and an append-only simulated entry/exit fill ledger.
- The API has a read-only deployment smoke check and the repository has a manual end-to-end release checklist.
- Live market feeds, broker connectivity, real-money execution, and personalised financial advice remain out of scope.

## Remaining implementation and release gaps

### P0 — Must be evidenced before production

1. **Connected Supabase integration validation.** Use the repository's configured Supabase/API environment with two dedicated test accounts and run the opt-in two-account suite. It deletes all learning data for Account A and must never use a real learner account. The latest paper-trade fill migration (20261012250000_paper_trade_fill_ledger.sql) still needs live database validation, including entry/exit trigger atomicity, backfill, RLS isolation, export inclusion, deletion cascade, P/L reconciliation, and idempotent retry behaviour. Static migration contract tests now protect key grants, RLS, trigger, backfill, and uniqueness invariants; these do not replace runtime database checks.
2. **Two-account security evidence.** Verify User A cannot read, export, alter, or delete User B's progress, attempts, journal entries, weekly plan, paper sessions, transition ledger, or fill ledger, and vice versa. Unit tests and CI do not prove live RLS isolation.
3. **Backup/restore rehearsal.** Follow the production runbook against a disposable environment and record actual restore evidence, rollback steps, and recovery ownership.
4. **Deployment evidence.** Vercel has been returning api-deployments-free-per-day because the project exceeded the free-tier daily deployment limit. This is an external deployment constraint, not a passing deployment. Recheck deployment after the quota window resets or after the deployment limit is resolved.
5. **Browser journey evidence.** The manual checklist exists, but an end-to-end browser run covering sign-in, lesson assessment, Chart Dojo, review queue, journal, export/restore, responsive layout, and keyboard/screen-reader basics still needs recorded evidence.

### P1 — Product completeness

1. **Long-term adaptive mastery operations.** Mastery and signed-in Adaptive Practice now use all retained relevant server attempts with paginated queries and fail closed on partial history. Still define retention/aggregation before per-account histories become large, and validate confidence/retention behaviour against live multi-account data.
2. **Full simulation engine.** The current simulator remains synthetic and simplified. It does not support instrument-specific tick size/value, contract size, lot increments, margin, spread/fees, ordinary slippage, pending orders, partial fills, or contract-accurate P/L. The fill ledger records the documented immediate-entry and simulated-exit assumptions; it is not a broker ledger.
3. **Community challenges and profiles.** Public profiles, community challenge submissions, leaderboards, reporting, and moderator workflows are not implemented. The product brief requires opt-in visibility, process-based scoring rather than P/L, no open direct messages, private-data protection, and an audited moderation trail.
4. **Licensed historical datasets.** No historical dataset should be imported or presented as history until rights, storage, redistribution, symbol mapping, timezone, and data validation requirements are confirmed.
5. **Content governance.** Human editorial approval and publication provenance must be recorded for all published curriculum and scenarios; automated checks are not editorial sign-off.
6. **Accessibility sign-off.** The manual audit checklist exists; complete and record the keyboard, screen-reader, contrast, reduced-motion, zoom/reflow, and mobile checks before release.

## Decisions that must not be silently invented

- Supported instrument specifications and cost assumptions for the simulator.
- Historical data provider, licence, storage, and redistribution rights.
- Community scoring rules, profile visibility, report categories, moderation actions, and moderator provisioning.
- Production hosting region, backup ownership, retention/analytics policy, and incident response ownership.

Until those decisions are made, keep simulation labels synthetic, do not introduce live/broker paths, and keep community publication disabled.

## Recommended next sequence

1. Confirm the checked-in migrations are applied to the connected Supabase project, then run the two-account integration suite using dedicated test accounts; fix every observed schema, RLS, trigger, and export/deletion issue.
2. Execute and record the release smoke checklist and backup/restore rehearsal.
3. Resolve the Vercel deployment quota and verify the deployed commit and API smoke command.
4. Agree the supported instrument/cost model before implementing instrument-accurate orders or P/L.
5. Agree community privacy/scoring/moderation policy before implementing public profiles, leaderboards, or moderation controls.
6. Confirm historical-data licensing before adding historical candles.
7. Update this audit after each merged phase; do not mark the application complete until the release gates above have recorded evidence.
