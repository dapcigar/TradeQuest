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
- Authenticated progress events persist foundations completion and first risk calculator use. Chart Dojo now has a versioned, database-backed catalogue of synthetic scenarios (three originals plus six unseen variants, see `docs/TRANSFER_PRACTICE.md`); answer keys remain server-only, and choices, server-authored feedback, scenario version, and recent attempt history are persisted separately. The introductory milestone reward is awarded once per learner.
- Anonymous demo progress remains separate from account progress. The authenticated `/v1/me/mastery` endpoint summarises Chart Dojo practice, server-scored spread-basics quiz attempts, and risk-calculator participation. It recommends the least-practised Chart Dojo skill, uses positive-decision rates only as a tie-breaker, and labels small samples as low-confidence. Risk-calculator use is tracked as participation, not mastery.
- The Paper Trade Lab runs a server-calculated, learner-bound synthetic scenario. It reveals one candle per request, calculates hypothetical size/P&L on the API, and uses a conservative stop-first rule for same-candle stop/target ambiguity. Sessions are temporary and are not a persistent trade ledger; see `docs/PAPER_TRADE_LAB.md`.

The application is still an MVP. Community accounts/leaderboards, full cross-device adaptive mastery, licensed historical datasets, and complete server-authoritative chart simulation are not complete.

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
2. Apply migrations 001–006 in numeric order:
   - `supabase/migrations/202610110001_m2_learner_progress.sql`
   - `supabase/migrations/202610110002_m2_progress_events_and_xp_guard.sql`
   - `supabase/migrations/202610110003_chart_dojo_progress_event.sql`
   - `supabase/migrations/202610110004_chart_dojo_attempt_history.sql`
   - `supabase/migrations/202610110005_repair_chart_dojo_attempt_history.sql` (safe, repeatable repair)
   - `supabase/migrations/202610110006_versioned_chart_dojo_scenarios.sql`
   - `supabase/migrations/20261011170155_harden_grants_and_milestone_claims.sql`
   - `supabase/migrations/20261011170834_foundations_milestone_requires_quiz.sql`
   - `supabase/migrations/20261011175355_chart_dojo_scenario_variants.sql`
3. Apply `supabase/seed/dev_spread_lesson.sql`.
4. Start the API and Vite frontend, then test with two dedicated test accounts.

Do not apply migrations to production until SQL, row-level security, RPC idempotency, and multi-user isolation have been validated in a disposable project. See the M2 implementation plan for the opt-in integration test setup.

## Validation

```bash
npm run test
npm run build
npm run api:build
```

See `docs/PAPER_TRADE_LAB.md` for simulation assumptions and limitations, `docs/IMPLEMENTATION_BRIEF.md` for product direction, `docs/M2_IMPLEMENTATION_PLAN.md` for the current account-persistence setup, `docs/PRODUCTION_READINESS.md` for the release gates that must be evidenced before launch, and `docs/RELEASE_SMOKE_TEST.md` for the repeatable manual end-to-end smoke checklist.
