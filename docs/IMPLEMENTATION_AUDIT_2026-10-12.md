# TradeQuest Implementation Audit — 12 October 2026

## Executive status

TradeQuest has a working React/Vite/TypeScript learner experience, a Node/Express API, Supabase Auth/Postgres persistence, server-scored learning attempts, evidence-based review recommendations, private decision journals, weekly practice plans, and a synthetic paper-trading lab.

**Status: active MVP development, not production-ready.** Unit tests/build/preflight are passing on the recent merged feature PRs, but a passing CI run is not proof that the latest Supabase migrations have been applied, two-account isolation has been exercised against a live disposable project, browser journeys have passed, or a deployment succeeded.

## Latest merged implementation phases

| PR | Status | Delivered |
|---|---|---|
| #82 | Merged | Read-only API smoke command checks health identity, defensive headers, and unauthenticated rejection on selected learner endpoints. |
| #83 | Merged | Private append-only simulated entry/exit fills; database triggers create fills with session start/closure; existing sessions are backfilled; API/UI/export integration and tests added. |
| #84 | Merged | Signed-in overview uses account-backed lesson completion, XP, and risk-tool evidence rather than browser-local demo state. |
| #85 | Merged | Solo challenge cards show process rubrics and the latest result from linked synthetic scenarios; results are not based on P/L. |
| #86 | Merged | Chart Dojo history endpoint and signed-in client state retain up to 500 attempts, matching the mastery engine's bounded history window. |

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

1. **Disposable Supabase integration validation.** Reconcile the target project's migration ledger, apply the checked-in migrations in order to a disposable project, and run the opt-in two-account API integration suite with dedicated test accounts. The latest paper-trade fill migration (20261012250000_paper_trade_fill_ledger.sql) needs live database validation, including entry/exit trigger atomicity, backfill, RLS isolation, export inclusion, deletion cascade, P/L reconciliation, and idempotent retry behaviour.
2. **Two-account security evidence.** Verify User A cannot read, export, alter, or delete User B's progress, attempts, journal entries, weekly plan, paper sessions, transition ledger, or fill ledger, and vice versa. Unit tests and CI do not prove live RLS isolation.
3. **Backup/restore rehearsal.** Follow the production runbook against a disposable environment and record actual restore evidence, rollback steps, and recovery ownership.
4. **Deployment evidence.** Vercel has been returning api-deployments-free-per-day because the project exceeded the free-tier daily deployment limit. This is an external deployment constraint, not a passing deployment. Recheck deployment after the quota window resets or after the deployment limit is resolved.
5. **Browser journey evidence.** The manual checklist exists, but an end-to-end browser run covering sign-in, lesson assessment, Chart Dojo, review queue, journal, export/restore, responsive layout, and keyboard/screen-reader basics still needs recorded evidence.

### P1 — Product completeness

1. **Full cross-device adaptive mastery.** Core account-backed attempts, review recommendations, dashboard progress, and a 500-attempt history window are implemented. The product still needs an explicit definition and validation of which additional learning signals should sync, how long-term history is retained/aggregated, and how confidence behaves beyond the bounded recent-attempt window.
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

1. Run the latest migrations and two-account integration suite against a disposable Supabase project; fix every observed schema, RLS, trigger, and export/deletion issue.
2. Execute and record the release smoke checklist and backup/restore rehearsal.
3. Resolve the Vercel deployment quota and verify the deployed commit and API smoke command.
4. Agree the supported instrument/cost model before implementing instrument-accurate orders or P/L.
5. Agree community privacy/scoring/moderation policy before implementing public profiles, leaderboards, or moderation controls.
6. Confirm historical-data licensing before adding historical candles.
7. Update this audit after each merged phase; do not mark the application complete until the release gates above have recorded evidence.
