# TradeQuest Implementation Audit — 12 October 2026

## Executive status

TradeQuest has a working React/Vite/TypeScript learner experience, a Node/Express API, Supabase Auth/Postgres persistence, server-scored learning attempts, evidence-based review recommendations, private decision journals, weekly practice plans, a synthetic paper-trading lab, opt-in community profiles, moderated challenge entries, and admin-only challenge editorial review.

**Status: active MVP development, not production-ready.** The repository now has a committed npm lockfile and zero high/critical dependency advisories, and CI uses reproducible installs. However, the connected Supabase integration run did not pass: the configured test tokens were rejected by the deployed API and several new routes returned 404. The current deployment must be updated and dedicated test credentials refreshed before live database/security evidence can be recorded.

## Latest merged implementation phases

| PR | Status | Delivered |
|---|---|---|
| #82 | Merged | Read-only API smoke checks for health identity, security headers, and unauthenticated rejection. |
| #83 | Merged | Private append-only simulated entry/exit fills, database triggers, backfill, API/UI/export integration, and tests. |
| #84 | Merged | Signed-in overview derives lesson completion, XP, and risk-tool participation from account-backed progress. |
| #85 | Merged | Solo challenge cards show process rubrics and latest-attempt feedback rather than P/L scoring. |
| #86 | Merged | Mastery/adaptive history pagination uses all retained relevant attempts; interactive history remains bounded. |
| #87 | Merged | Initial dated implementation audit and explicit release blockers. |
| #88 | Merged | Short-side fill reconciliation, closed-session replay idempotency, and account-isolation tests. |
| #89 | Merged | Connected-Supabase two-account integration workflow wiring. |
| #90 | Merged | Private-by-default community profiles, owner-bound profile RPCs, and privacy-safe directory. |
| #91 | Merged | Process-scored community entries, reporting, moderation queue/actions, and durable moderation audit. |
| #92 | Merged | Mastery and adaptive practice use all retained relevant server attempts and fail closed on incomplete history. |
| #93 | Merged | Source provenance, content versions, and admin-only challenge editorial review/publish/revise/retire workflow. |
| #94 | Merged | Updated audit for community/mastery phases. |
| #95 | Merged | User-defined synthetic tick/cost/lot/margin assumptions, lot-step-aware sizing, effective fills, cost-aware P/L, and export support. |
| #96 | Merged | Updated audit for configurable simulation costs. |
| #97 | Merged, superseded | Temporarily added a one-shot push trigger for integration testing; later returned to manual-only execution for safety. |
| #98 | Merged | Fixed integration workflow setup by removing npm caching while no lockfile existed. |
| #99 | Merged | Added token/API preflight before mutating integration tests and restored manual-only execution. |
| #100 | Merged | Added the same confirmation/preflight safeguards to the legacy Supabase integration workflow. |
| #101 | Merged | Added a guarded lockfile-refresh workflow and dependency audit reporting. |
| #102 | Merged | Committed `package-lock.json`, upgraded Vite to 6.4.4 and Vitest to 4.1.11, switched CI to `npm ci`, and added a high/critical npm audit gate. |
| #103 | Merged | Refreshed the audit after connected-integration findings and dependency security work. |
| #104 | Merged | Expanded read-only smoke coverage to every protected API GET route. |
| #105 | Merged | Added unauthenticated smoke probes for protected GET/POST/PATCH/DELETE methods. |
| #106 | Merged | Made the smoke-route contract exact in both directions and removed an undeclared endpoint. |
| #107 | Merged | Added a local JWT-subject guard so the destructive integration workflow refuses duplicate Account A/Account B identities before any API request. Live integration was not run. |
| #108 | Merged | Added moderator-only read access to the latest 100 moderation actions, a moderator history panel, route smoke coverage, migration contract tests, and ordered migration documentation. |

The latest lockfile-refresh run passed tests, frontend build, API build, and release preflight. Its final npm audit summary was **0 vulnerabilities**. The standard CI workflow now repeats the tests/builds/preflight with `npm ci` and `npm audit --audit-level=high`.

## Implemented foundations

- Anonymous demo activity is kept separate from account-backed activity.
- Signed-in Chart Dojo and Adaptive Practice use server-scored attempts and server-provided feedback; answer keys are not sent to the client.
- Mastery and signed-in Adaptive Practice page through all retained relevant attempts; incomplete history fails closed.
- The review queue is based on server-stored practice evidence and labels limited evidence conservatively.
- Learner-owned weekly plans, decision journal entries, paper-trade sessions, transition events, simulated fills, community profiles, challenge entries, and reports are included in account export/deletion flows. Moderation/editorial audit history is retained separately.
- Replay cursor tokens are signed and learner-bound; replay returns one synthetic candle per request.
- Paper Trade Lab supports user-defined tick size/value, contract size for margin, lot increment, spread, per-side commission/slippage and leverage. Server-side sizing, estimated stop loss, margin, effective fills and realised simulated P/L use the same assumptions. The default remains a fictional generic model, not a verified instrument preset.
- Community profiles are private by default. Public challenge entries require opt-in and moderator approval. New challenge content defaults to unpublished draft status; only an explicitly provisioned admin can approve or retire challenge content.
- CI now uses a committed lockfile and blocks high/critical npm advisories.
- Live market feeds, broker connectivity, real-money execution, and personalised financial advice remain out of scope.

## Remaining implementation and release gaps

### P0 — Must be evidenced before production

1. **Connected Supabase/API integration.** A run was attempted on 12 October. All 17 integration tests failed: authenticated requests received HTTP 401 and several newer endpoints returned HTTP 404. No authenticated test mutations completed successfully. The workflow now validates both test accounts against `GET /v1/me/progress` and verifies their decoded JWT subjects are distinct before starting the suite, so invalid or duplicate account tokens fail fast. The implementation work here did not run or connect to the live Supabase integration; the repository owner will run that manually. Refresh the dedicated bearer-token secrets, deploy the current API, reconcile/apply the migrations in order, and rerun with the explicit confirmation. Do not report the database integration as passed until this succeeds.
2. **Two-account security evidence.** Verify User A cannot read, export, alter, or delete User B's progress, attempts, journal entries, weekly plan, paper sessions, transition/fill ledger, community profile, challenge entries, or reports, and vice versa. Static tests do not prove live RLS isolation.
3. **Trusted community roles and editorial sign-off.** Provision a verified moderator/admin through the documented database-admin procedure. Apply `20261013060000_community_moderation_history.sql`, review the legacy-published challenge definitions, test approval/revision/retirement, moderation reports and the newest-first history panel, and confirm ordinary learners receive HTTP 403 from protected queues/actions.
4. **Backup/restore rehearsal.** Follow the production runbook against a disposable environment and record actual restore evidence, rollback steps, and recovery ownership.
5. **Deployment evidence.** Vercel has been returning `api-deployments-free-per-day` because the project exceeded the free-tier daily deployment limit. The latest repository code has not been verified on the deployed API; resolve the quota or use an approved deployment path, then verify the commit and API smoke check.
6. **Browser journey evidence.** The manual checklist exists, but an end-to-end browser run covering sign-in, lesson assessment, Chart Dojo, review queue, journal, export/deletion, community profile, challenge submission/reporting, editorial/moderation screens, responsive layout, and keyboard/screen-reader basics still needs recorded evidence.

### P1 — Product completeness

1. **Long-term mastery operations.** Current mastery uses all retained relevant attempts, but retention/aggregation and confidence behaviour need validation at scale.
2. **Full simulation engine.** User-defined tick/cost/lot/margin assumptions are implemented. The model is not a verified instrument preset and still lacks pending orders, partial fills, margin calls/liquidation, currency conversion, contract-specific gap handling, broker connectivity, and contract-accurate P/L.
3. **Broader community product.** Opt-in profiles, private reflections, public-entry moderation/reporting, and editorial review are implemented. Community leaderboards, user-authored challenge creation, moderator appeals/history UI, and a wider administration console remain incomplete. Do not introduce P/L-based rankings or direct messaging.
4. **Licensed historical datasets.** No historical dataset should be imported or presented as history until rights, storage, redistribution, symbol mapping, timezone, and data validation requirements are confirmed.
5. **Content governance beyond the community catalogue.** Challenge provenance and publication decisions are recorded, but human editorial approval and publication provenance still need to be recorded for the rest of the curriculum and scenarios.
6. **Accessibility sign-off.** The manual audit checklist exists; complete and record keyboard, screen-reader, contrast, reduced-motion, zoom/reflow, and mobile checks before release.

## Decisions that must not be silently invented

- Supported instrument specifications and cost assumptions for verified presets.
- Historical data provider, licence, storage, and redistribution rights.
- Community scoring rules, profile visibility, report categories, moderation actions, appeal process, and trusted moderator/admin provisioning.
- Production hosting region, backup ownership, retention/analytics policy, and incident response ownership.

Until those decisions and release gates are addressed, keep simulation labels synthetic, do not introduce live/broker paths, and keep public community submissions pending until a trusted moderator is provisioned.

## Recommended next sequence

1. Refresh the two dedicated bearer-token secrets and deploy the current API; verify both accounts against `GET /v1/me/progress`.
2. Apply/reconcile migrations in order, then run the connected two-account integration suite and fix every observed schema, RLS, trigger, export, and deletion issue.
3. Provision a trusted moderator/admin, review legacy-published challenge content, and verify moderation/editorial workflows end to end.
4. Execute and record the release smoke checklist and backup/restore rehearsal.
5. Resolve the Vercel deployment quota or use an approved deployment path; verify the deployed commit and API smoke command.
6. Agree the supported instrument/cost model before implementing verified presets or more advanced order types.
7. Confirm historical-data licensing, complete browser/accessibility checks, and update this audit after each merged phase. Do not mark the application complete until the release gates above have recorded evidence.
