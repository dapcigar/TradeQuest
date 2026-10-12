# TradeQuest Implementation Audit — 12 October 2026

## Executive status

TradeQuest has a working React/Vite/TypeScript learner experience, a Node/Express API, Supabase Auth/Postgres persistence, server-scored learning attempts, evidence-based review recommendations, private decision journals, weekly practice plans, a synthetic paper-trading lab, opt-in community profiles, moderated challenge entries, and admin-only challenge editorial review.

**Status: active MVP development, not production-ready.** GitHub Actions tests/build/release preflight pass for the merged feature phases, but this is not proof that the latest Supabase migrations are applied to the connected project, two-account isolation has been exercised against the live API/database, moderator/editor roles have been provisioned, browser journeys have passed, or a deployment succeeded.

## Latest merged implementation phases

| PR | Status | Delivered |
|---|---|---|
| #82 | Merged | Read-only API smoke command checks health identity, defensive headers, and unauthenticated rejection on selected learner endpoints. |
| #83 | Merged | Private append-only simulated entry/exit fills; database triggers create fills with session start/closure; existing sessions are backfilled; API/UI/export integration and tests added. |
| #84 | Merged | Signed-in overview uses account-backed lesson completion, XP, and risk-tool evidence rather than browser-local demo state. |
| #85 | Merged | Solo challenge cards show process rubrics and the latest result from linked synthetic scenarios; results are not based on P/L. |
| #86 | Merged | Chart Dojo interactive history remains capped at 500 records for responsive UI; mastery and adaptive recommendation APIs page through all retained relevant attempts. |
| #87 | Merged | Added the dated implementation audit and explicit release blockers. |
| #88 | Merged | Added short-side paper-trade fill reconciliation, closed-session replay idempotency, and cross-account fill isolation tests. |
| #89 | Merged | Added opt-in connected-Supabase integration workflow wiring with explicit dedicated-test-account confirmation. |
| #90 | Merged | Added private-by-default community profiles, owner-bound profile RPCs, and a privacy-safe directory. |
| #91 | Merged | Added process-scored community challenge entries, private reporting, moderation queue/actions, and durable moderation audit records. |
| #92 | Merged | Mastery and signed-in Adaptive Practice use all retained relevant attempts with paginated loading and fail closed on incomplete history. |
| #93 | Merged | Added source provenance, content versions, and admin-only editorial review/publish/revise/retire actions with an audit trail. |
| #95 | Merged | Added user-defined synthetic tick/cost/lot/margin assumptions, lot-step-aware server sizing, effective fill prices, cost-aware P/L, export fields, and migration/backward-replay tests. |

For these merged phases, GitHub Actions passed `npm run test`, `npm run build`, `npm run api:build`, and `npm run release:preflight` before merge.

## Implemented foundations

- Anonymous demo activity is kept separate from account-backed activity.
- Signed-in Chart Dojo and Adaptive Practice use server-scored attempts and server-provided feedback; answer keys are not sent to the client.
- The mastery endpoint pages through all retained Chart Dojo and lesson attempts; signed-in Adaptive Practice uses aggregate counts across all retained adaptive variants. The interactive history endpoint remains capped at 500 records.
- The review queue is based on server-stored practice evidence and labels limited evidence conservatively.
- Learner-owned weekly plans, decision journal entries, paper-trade sessions, session transition events, simulated fills, community profiles, challenge entries, and reports are included in account export/deletion flows. Moderation/editorial audit history is retained separately.
- Replay cursor tokens are signed and learner-bound; replay returns one synthetic candle per request.
- Paper Trade Lab uses server-authoritative candle advancement and version checks, with append-only session-transition and simulated entry/exit fill ledgers. It supports user-defined tick size/value, contract size for margin, lot increment, spread, per-side commission/slippage and leverage; the generic baseline remains fictional and unverified.
- Community profiles are private by default. Public challenge entries require an opted-in profile and moderator approval; new challenge content defaults to unpublished draft status. Only an explicitly provisioned admin can approve or retire challenge content.
- The API has a read-only deployment smoke check and the repository has a manual end-to-end release checklist.
- Live market feeds, broker connectivity, real-money execution, and personalised financial advice remain out of scope.

## Remaining implementation and release gaps

### P0 — Must be evidenced before production

1. **Connected Supabase integration validation.** Apply/reconcile the ordered migrations, then run the opt-in two-account suite against the configured Supabase/API environment with dedicated test accounts. It deletes all learning data for Account A and must never use a real learner account. Validate paper-trade trigger atomicity/backfill, RLS, profile privacy, challenge entry idempotency, editorial/moderation role checks, export/deletion cascades, lot-step/risk/margin constraints, effective fill prices, configured costs, and fill/P&L reconciliation. Static migration tests do not replace runtime database checks.
2. **Two-account security evidence.** Verify User A cannot read, export, alter, or delete User B's progress, attempts, journal entries, weekly plan, paper sessions, transition/fill ledger, community profile, challenge entries, or reports, and vice versa.
3. **Trusted community roles and editorial sign-off.** Provision a verified moderator/admin through the documented database-admin procedure. Review the legacy-published challenge definitions, test approval/revision/retirement and moderation reports, and confirm ordinary learners receive HTTP 403 from protected queues/actions. Do not claim the moderation workflow is operational until a trusted role is provisioned.
4. **Backup/restore rehearsal.** Follow the production runbook against a disposable environment and record actual restore evidence, rollback steps, and recovery ownership.
5. **Deployment evidence.** Vercel has been returning `api-deployments-free-per-day` because the project exceeded the free-tier daily deployment limit. This is an external deployment constraint, not a passing deployment. Recheck deployment after the quota window resets or after the deployment limit is resolved.
6. **Browser journey evidence.** The manual checklist exists, but an end-to-end browser run covering sign-in, lesson assessment, Chart Dojo, review queue, journal, export/deletion, community profile, challenge submission/reporting, editorial/moderation screens, responsive layout, and keyboard/screen-reader basics still needs recorded evidence.

### P1 — Product completeness

1. **Long-term mastery operations.** Mastery and signed-in Adaptive Practice now use all retained relevant server attempts with paginated queries and fail closed on partial history. Define retention/aggregation before per-account histories become large, and validate confidence/retention behaviour against live multi-account data.
2. **Full simulation engine.** User-defined tick size/value, contract size for margin, lot increments, spread, per-side commission/slippage, leverage, lot-step sizing, and cost-aware simulated fills are implemented. The model is not a verified instrument preset and still lacks pending orders, partial fills, margin calls/liquidation, currency conversion, contract-specific gap handling, broker connectivity, and contract-accurate P/L. The fill ledger remains an educational synthetic ledger, not a broker ledger.
3. **Broader community product.** Opt-in profiles, private reflections, public-entry moderation/reporting, and editorial review are implemented. Public profiles with richer learning stats, community leaderboards, user-authored challenge creation, moderator appeals/history UI, and a wider community administration console remain incomplete. Do not introduce P/L-based rankings or direct messaging.
4. **Licensed historical datasets.** No historical dataset should be imported or presented as history until rights, storage, redistribution, symbol mapping, timezone, and data validation requirements are confirmed.
5. **Content governance beyond the community catalogue.** Challenge provenance and publication decisions are recorded, but human editorial approval and publication provenance still need to be recorded for the rest of the curriculum and scenarios.
6. **Accessibility sign-off.** The manual audit checklist exists; complete and record the keyboard, screen-reader, contrast, reduced-motion, zoom/reflow, and mobile checks before release.

## Decisions that must not be silently invented

- Supported instrument specifications and cost assumptions for the simulator.
- Historical data provider, licence, storage, and redistribution rights.
- Community scoring rules, profile visibility, report categories, moderation actions, appeal process, and trusted moderator/admin provisioning.
- Production hosting region, backup ownership, retention/analytics policy, and incident response ownership.

Until those decisions and release gates are addressed, keep simulation labels synthetic, do not introduce live/broker paths, and keep public community submissions pending until a trusted moderator is provisioned.

## Recommended next sequence

1. Confirm the checked-in migrations are applied to the connected Supabase project, then run the two-account integration suite using dedicated test accounts; fix every observed schema, RLS, trigger, export, and deletion issue.
2. Provision a trusted moderator/admin, review the legacy-published challenge content, and verify moderation/editorial workflows end to end.
3. Execute and record the release smoke checklist and backup/restore rehearsal.
4. Resolve the Vercel deployment quota and verify the deployed commit and API smoke command.
5. Agree the supported instrument/cost model before implementing instrument-accurate orders or P/L.
6. Confirm historical-data licensing before adding historical candles.
7. Complete the remaining accessibility/browser checks and update this audit after each merged phase; do not mark the application complete until the release gates above have recorded evidence.
