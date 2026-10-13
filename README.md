# TradeQuest

A free, risk-first trading education game for beginners learning forex, gold, indices, commodities, and other markets.

## MVP principles

- Historical and clearly labelled synthetic data only; no live market feeds.
- No broker integration or real-money execution.
- Risk management and learning outcomes matter more than simulated profit.
- AI-assisted learning content requires automated checks and human editorial approval.
- Desktop and mobile are equal priorities.

## Current implementation

- Responsive React + Vite + TypeScript frontend.
- Supabase-managed email/password authentication.
- Node/Express TypeScript API verifies learner access tokens and forwards the JWT to Supabase so RLS and `auth.uid()` operate in the learner's context.
- Supabase PostgreSQL stores learner progress and server-scored lesson attempts.
- First server-scored lesson: spread basics.
- Authenticated progress events persist foundations completion and first risk calculator use. Chart Dojo now has a versioned, database-backed catalogue of synthetic scenarios (three originals plus 21 additional variants, including six dedicated Adaptive Practice variants; see `docs/TRANSFER_PRACTICE.md`); answer keys remain server-only, and choices, server-authored feedback, scenario version, and recent attempt history are persisted separately. The introductory milestone reward is awarded once per learner.
- Anonymous demo progress remains separate from account progress. When signed in, the mission overview derives lesson completion, XP, and risk-tool participation from server-stored account progress instead of browser-local demo state. The authenticated `/v1/me/mastery` endpoint summarises Chart Dojo practice, server-scored spread-basics quiz attempts, and risk-calculator participation. It recommends the least-practised Chart Dojo skill, uses positive-decision rates only as a tie-breaker, and labels small samples as low-confidence. Risk-calculator use is tracked as participation, not mastery.
- Signed-in Adaptive Practice uses server-scored Chart Dojo attempts and server-side summaries across all retained adaptive variants; anonymous learners retain a separate browser-local demo mode. The mastery API also pages through all retained Chart Dojo and lesson attempts instead of silently stopping at the most recent 500. The interactive history endpoint remains bounded to 500 records for responsive screens. Solo challenge results use the latest process-rubric result from account history. Apply `20261012201500_adaptive_practice_server_scenarios.sql` before enabling the new variants in a Supabase environment.
- Signed-in learners can export server-stored progress, quiz attempts, Chart Dojo attempts, account-backed weekly plans and sessions, private journal entries, saved synthetic paper-trade sessions, community profile, challenge entries, reports, and append-only event/fill history from the Weekly Practice Plan. The export is account-scoped and excludes credentials/tokens; browser-local records remain a separate export.
- Signed-in learners can also permanently delete their server-saved learning records after typing an explicit confirmation phrase. This includes community profiles, entries and reports but retains moderation audit history. It does not delete the Supabase Auth identity or browser-local records; those are separate operations.
- Community profiles are private by default and expose only an opted-in handle, display name and bio. Curated community challenge entries are scored from saved server-scored attempts, stay private by default, and require an opted-in profile plus moderator approval before appearing publicly. Reporting and reason-required moderation actions are recorded in an audit trail; no direct messages or P/L leaderboard are provided. A separate admin-only editorial queue tracks source provenance and content versions, and records approve/revise/retire decisions before new challenge content is published. See `docs/COMMUNITY_MODERATION.md` for trusted moderator/admin provisioning.
- The Paper Trade Lab stores each learner's synthetic session and final outcome in Supabase. Session creation and candle advancement are server-authoritative; advancement uses version checks and retries return the last accepted response. Learners can configure a synthetic execution model (tick size/value, contract size for margin, lot increment, spread, per-side commission/slippage and leverage). Server-side sizing, effective entry/exit fills, costs, estimated stop loss and margin are persisted and included in account exports. Fill records are server-created and private to the learner. This remains a simplified educational simulator, not a verified instrument preset, broker, pending-order/partial-fill engine, or contract-accurate execution system; see `docs/PAPER_TRADE_LAB.md`.

The application is still an MVP. Opt-in profiles and moderated challenge entries are implemented, and adaptive recommendations now use all retained server attempts. Community leaderboards, a long-term retention/aggregation policy for very large histories, licensed historical datasets, and complete server-authoritative chart simulation remain incomplete. Public challenge publication remains gated by moderator provisioning and human content review.

## Development

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

For the API, create `server/.env` with the server variables from `.env.example`, then run `npm run api:dev` in a separate terminal. Configure the Vite frontend variables in `.env.local`.

## Supabase setup (development project only)

1. Configure Supabase Auth email confirmation and allowed redirect URLs for local and deployed origins.
2. Review and apply SQL migrations in lexicographic filename order to a development project:
   - `supabase/migrations/202610110001_m2_learner_progress.sql`
   - `supabase/migrations/202610110002_m2_progress_events_and_xp_guard.sql`
   - `supabase/migrations/202610110003_chart_dojo_progress_event.sql`
   - `supabase/migrations/202610110004_chart_dojo_attempt_history.sql`
   - `supabase/migrations/202610110005_repair_chart_dojo_attempt_history.sql` (safe, repeatable repair)
   - `supabase/migrations/202610110006_versioned_chart_dojo_scenarios.sql`
   - `supabase/migrations/202610110011_risk_budget_reasoning.sql`
   - `supabase/migrations/20261011170155_harden_grants_and_milestone_claims.sql`
   - `supabase/migrations/20261011170834_foundations_milestone_requires_quiz.sql`
   - `supabase/migrations/20261011175355_chart_dojo_scenario_variants.sql`
   - `supabase/migrations/20261011182406_chart_dojo_transfer_depth.sql`
   - `supabase/migrations/20261011200000_decision_journal.sql`
   - `supabase/migrations/20261012201500_adaptive_practice_server_scenarios.sql`
   - `supabase/migrations/20261012210000_paper_trade_ledger.sql`
   - `supabase/migrations/20261012220000_delete_own_learning_data.sql`
   - `supabase/migrations/20261012230000_account_weekly_practice_plan.sql`
   - `supabase/migrations/20261012240000_paper_trade_ledger_events.sql`
   - `supabase/migrations/20261012250000_paper_trade_fill_ledger.sql`
   - `supabase/migrations/20261012260000_community_profiles.sql`
   - `supabase/migrations/20261012270000_community_challenge_lifecycle.sql`
   - `supabase/migrations/20261012280000_community_challenge_editorial_review.sql`
   - `supabase/migrations/20261012290000_paper_trade_execution_assumptions.sql`
   - `supabase/migrations/20261013060000_community_moderation_history.sql`
   - `supabase/migrations/20261013070000_community_editorial_history.sql`
   - `supabase/migrations/20261013080000_community_challenge_proposals.sql`
   - `supabase/migrations/20261013090000_hide_unsubmitted_challenge_drafts.sql`
   - `supabase/migrations/20261013100000_server_own_proposal_outcome.sql`
3. Apply `supabase/seed/dev_spread_lesson.sql`.
4. Start the API and Vite frontend, then test with two dedicated test accounts. Configure the server-only `REPLAY_CURSOR_SECRET` with a random value of at least 32 characters.

Do not apply migrations to production until SQL, row-level security, RPC idempotency, and multi-user isolation have been validated in a disposable project. See the M2 implementation plan for the opt-in integration test setup.

## Validation

```bash
npm run test
npm run build
npm run api:build
npm run release:preflight
```

For a read-only check against a deployed or local API, set `TRADEQUEST_SMOKE_API_URL` to the API base URL and run `npm run api:smoke`. It checks the health response, defensive headers, and that key learner endpoints reject unauthenticated requests. It does not mutate learner data and does not replace the two-account integration suite or manual browser smoke test.

See `docs/PAPER_TRADE_LAB.md` for simulation assumptions and limitations, `docs/IMPLEMENTATION_BRIEF.md` for product direction, `docs/M2_IMPLEMENTATION_PLAN.md` for the current account-persistence setup, `docs/SECURITY_ARCHITECTURE.md` for trust boundaries and security controls, `docs/ACCESSIBILITY.md` for the manual accessibility audit, `docs/CONTENT_REVIEW_REGISTER.md` for curriculum coverage and editorial sign-off, `docs/PRODUCTION_READINESS.md` for the release gates that must be evidenced before launch, `docs/PRODUCTION_RUNBOOK.md` for backup/restore and rollback procedures, and `docs/RELEASE_SMOKE_TEST.md` for the repeatable manual end-to-end smoke checklist.
