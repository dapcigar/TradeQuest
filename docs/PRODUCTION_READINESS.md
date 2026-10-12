# TradeQuest production-readiness gates

This checklist is an operational gate, not a claim that TradeQuest is production-ready. Check each item against the actual target environment and record evidence before launch. Keep the £0-budget constraint: prefer local checks and eligible free tiers, but do not assume a free tier has unlimited capacity or production-grade recovery.

## Current release boundary

- [ ] Synthetic scenarios are visibly labelled; no live market feed is enabled.
- [ ] No broker connection, copy trading, real-money order path, or personalised financial advice.
- [ ] Anonymous Adaptive Practice, Weekly Practice Plan, and anonymous Decision Journal use browser-local storage. They are not account-synced and can be lost when browser data is cleared. Signed-in Adaptive Practice uses server-scored Chart Dojo attempts, but the new scenario migration must be applied before those variants are available. Export important local data before changing devices.
- [ ] Paper Trade Lab sessions are temporary signed simulations, not a persistent or tamper-evident trade ledger. Replaying an earlier valid token can fork a practice run; this does not alter a saved account balance because none is persisted. See `PAPER_TRADE_LAB.md`.
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
- [ ] Verify database grants and RLS deny unauthorised access even when requests bypass the UI.
- [ ] Verify retries and concurrent requests cannot duplicate XP or milestone rewards.
- [ ] Verify invalid scenario IDs, stale versions, unknown choices, malformed inputs, and client-supplied outcome fields are rejected.
- [ ] Confirm answer keys and scoring authority are not exposed in browser bundles, API responses, or logs.

### Secrets and authentication
- [ ] Confirm no service-role key, access token, password, or connection string is committed or sent to the browser.
- [ ] Confirm auth confirmation/recovery flows and redirect allowlists contain only expected origins.
- [ ] Check session expiry, sign-out, and unauthorised API responses.
- [ ] Use separate secrets per environment; never copy production credentials into tests or chat.

## P1 — Required before inviting external learners

### Reliability and abuse controls
- [ ] Set conservative rate limits for authentication-adjacent and write endpoints; test the expected response when limits are exceeded.
- [ ] Configure basic error monitoring and health checks without logging tokens, journal contents, or other sensitive learner data.
- [ ] Document a backup/export method, restore procedure, recovery owner, and last successful restore test.
- [ ] Verify deployment rollback and database compatibility for the previous application version.
- [ ] Check provider quotas and free-tier limits. A blocked deployment due to a provider quota is not a successful release.

### Privacy and data lifecycle
- [ ] Explain which records are server-saved versus browser-local, and how local exports/imports work.
- [ ] Test export/restore with malformed and oversized files; ensure imports never restore authentication tokens or overwrite unrelated browser storage.
- [ ] Define and test account-data deletion and retention behaviour before collecting more personal data.
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
- [ ] Ensure risk-budget examples use internally consistent figures and disclose omitted costs/uncertainty.
- [ ] Check that no content promises profits, guarantees outcomes, or encourages learners to increase risk after a positive score.

## P2 — Before calling the experience complete

- [ ] Decide whether browser-local Adaptive Practice history should remain local or be replaced by account-backed, server-scored attempts. Do not present the current local score as server-derived mastery.
- [ ] Decide whether the weekly plan and demo journal should sync across devices; communicate current limits until implemented.
- [ ] Decide whether paper-trade sessions need a persistent server-authoritative ledger. If yes, implement transactional session/order storage, idempotency keys, RLS isolation, and two-account integration tests before treating it as a full simulator.
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
