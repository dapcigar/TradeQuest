# TradeQuest production-readiness gates

This checklist is an operational gate, not a claim that TradeQuest is production-ready. Check each item against the actual target environment and record evidence before launch. Keep the £0-budget constraint: prefer local checks and eligible free tiers, but do not assume a free tier has unlimited capacity or production-grade recovery.

## Current release boundary

- [ ] Synthetic scenarios are visibly labelled; no live market feed is enabled.
- [ ] No broker connection, copy trading, real-money order path, or personalised financial advice.
- [ ] Anonymous Adaptive Practice, Weekly Practice Plan, and demo Decision Journal use browser-local storage. Signed-in Adaptive Practice, Weekly Practice Plan, and private Decision Journal use server-saved account data after their migrations are applied. Browser-local records remain separate and can be lost when browser data is cleared. Export important local data before changing devices.
- [ ] Paper Trade Lab sessions and append-only session transition events are persisted privately in Supabase by the paper-trade migrations; verify both are applied only after disposable-project tests. The simulator is not a full order/fill ledger or instrument-accurate execution engine. The separate legacy replay endpoint remains stateless. See `PAPER_TRADE_LAB.md`.
- [ ] Server-scored lessons and Chart Dojo remain authoritative on the API/database; never trust client-submitted score, answer key, XP, or pass state.
- [ ] Community/leaderboards, licensed historical data, and complete server-authoritative chart simulation remain out of scope until separately reviewed.

## P0 — Required before any production database change

### Environment and migrations
- [ ] Identify the exact Supabase project and branch targeted by the change; record project ref and environment (development, disposable test, or production).
- [ ] Compare local migration files with the target project's migration ledger. Investigate every missing, duplicate, or renamed version before applying anything.
- [ ] Review SQL changes and rollback/recovery approach. Never run speculative migration repair or mark migrations applied merely to silence a warning.
- [ ] Apply new migrations first to a disposable project, then run schema/RLS checks and the integration suite.
- [ ] Do not use production or personal learner accounts for write-heavy integration tests.

### Account isolation and authoritative scoring
- [ ] Run the opt-in integration suite against a disposable Supabase project with two dedicated test accounts; verify it actually ran rather than skipped.
- [ ] Verify account A cannot read, edit, delete, or infer account B's journal, attempts, progress, adaptive practice history, or mastery.
- [ ] Record the result of the two-account cross-account tests; a skipped integration suite is not evidence that isolation passed.
- [ ] Run the manual GitHub Actions workflow `Disposable Supabase integration` against a disposable project using two dedicated accounts; save the successful run URL.
- [ ] Verify database grants and RLS deny unauthorised access even when requests bypass the UI.
- [ ] Verify retries and concurrent requests cannot duplicate XP or milestone rewards.
- [ ] Verify invalid scenario IDs, stale versions, unknown choices, malformed inputs, and client-supplied outcome fields are rejected.
- [ ] Confirm answer keys and scoring authority are not exposed in browser bundles, API responses, or logs.

### Secrets and authentication
- [ ] Confirm no service-role key, access token, password, or connection string is committed or sent to the browser. Review docs/SECURITY_ARCHITECTURE.md when changing trust boundaries, headers, origins, or rate limits.
- [ ] Confirm auth confirmation/recovery flows and redirect allowlists contain only expected origins.
- [ ] Check session expiry, sign-out, and unauthorised API responses.
- [ ] Use separate secrets per environment; never copy production credentials into tests or chat.

## P1 — Required before inviting external learners

### Reliability and abuse controls
- [ ] The API returns defensive response headers and the frontend has a CSP, but verify both on the deployed origins. The in-memory 60/minute limiter remains per instance and is not a global quota; the API now also combines it with database-backed per-account limits for high-risk writes, exports, and deletion. Apply `20261012250000_shared_user_rate_limits.sql` and test its cross-instance behavior in a disposable project. Neither control replaces provider-level IP/edge protection; configure and verify that before external launch.
- [ ] Configure basic error monitoring and health checks without logging tokens, journal contents, or other sensitive learner data.
- [ ] Document a backup/export method, restore procedure, recovery owner, and last successful restore test using docs/PRODUCTION_RUNBOOK.md.
- [ ] Verify deployment rollback and database compatibility for the previous application version.
- [ ] Check provider quotas and free-tier limits. A blocked deployment due to a provider quota is not a successful release.

### Privacy and data lifecycle
- [ ] Explain which records are server-saved versus browser-local, and how local exports/imports work. A signed-in server-side learning export is implemented at `/v1/me/export`, including weekly plans, paper-trade sessions, and session event history; validate its completeness and privacy in a disposable project before launch.
- [ ] Test browser-local export/restore with malformed and oversized files; ensure imports never restore authentication tokens or overwrite unrelated browser storage. Test server export account isolation and confirm oversized exports fail rather than returning partial data.
- [ ] Self-service deletion of server-saved learning records is implemented by `20261012220000_delete_own_learning_data.sql` and is extended to weekly plans by `20261012230000_account_weekly_practice_plan.sql`; paper-trade event history cascades with its session. Verify it on a disposable project. It does not delete the Supabase Auth identity or browser-local records. Define retention and test those separate deletion paths before collecting more personal data.
- [ ] Keep journals private by default; never expose private notes or learner activity through public profiles or leaderboards.
- [ ] Review third-party logging, analytics, and hosting data handling.

### Accessibility and responsive quality
- [ ] Complete keyboard-only checks for navigation, dialogs, forms, feedback, and error states.
- [ ] Check screen-reader names/status announcements, visible focus, contrast, and reduced-motion behaviour.
- [ ] Test at narrow mobile widths and desktop; check long content, empty/loading/error states, and touch targets.
- [ ] Ensure learning feedback avoids pressure mechanics and does not imply that quiz success predicts live trading outcomes.

### Content governance
- [ ] Review every published synthetic scenario for correct arithmetic, one defensible answer, balanced choice ordering, and clear rationale.
- [ ] Record editorial approval and scenario version. Automated tests are not editorial approval.
- [ ] Reconcile docs/CONTENT_REVIEW_REGISTER.md and obtain named human sign-off for every published module; do not mark automated checks as approval.
- [ ] Ensure risk-budget examples use internally consistent figures and disclose omitted costs/uncertainty.
- [ ] Check that no content promises profits, guarantees outcomes, or encourages learners to increase risk after a positive score.

## P2 — Before calling the experience complete

- [ ] Anonymous Adaptive Practice remains browser-local; signed-in Adaptive Practice uses server-scored account attempts. Verify the UI keeps those modes distinct and never presents an anonymous local score as account-derived mastery.
- [ ] Signed-in weekly plans and private journals sync through the account; anonymous weekly plans and demo journal records remain browser-local. Verify the UI clearly communicates this separation.
- [ ] Persistent paper-trade sessions and append-only session transition events are implemented, but a full order/fill ledger and instrument-accurate P/L remain unfinished. Validate trigger atomicity, idempotent retries, RLS isolation and two-account integration before treating the simulator as release-ready.
- [ ] The generic risk calculator rejects intermediate overflow/underflow. It remains a price-distance estimate; instrument-specific increments, costs, margin, and contract-accurate P/L are unsupported until instrument specifications are approved.
- [ ] Add an end-to-end smoke path covering sign-in, lesson assessment, Chart Dojo, review queue, journal, export, and restore.
- [ ] Establish a small release note and known-limitations section for each launch.
- [ ] Re-check this list after any auth, schema, scoring, or storage change.

## Evidence record

For each release, attach:
- Git commit and pull request.
- CI run URL and result.
- Migration versions and target environment.
- Disposable-project integration run URL/result, including proof that tests were not skipped.
- Manual smoke-test date and result.
- Known issues, rollback plan, and person approving release.

**Release rule:** a green unit/build CI run is necessary but does not prove live RLS isolation, successful migration application, backup recovery, or production readiness. Do not describe those gates as passed without recorded evidence.
