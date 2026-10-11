# M2 — Supabase + Node.js implementation

## Decisions confirmed
- Supabase database and managed authentication.
- Node.js / TypeScript API.
- £0 initial infrastructure budget; develop locally and use eligible free tiers without assuming they are permanently free.
- No live data, broker integration, paid AI dependency or real-money execution.

## Architecture in this repository
- React + Vite frontend.
- Browser uses `@supabase/supabase-js` and a public publishable key for managed email/password authentication and persistent sessions.
- Node/Express API validates Supabase access tokens and forwards the learner JWT to a request-scoped Supabase client so RLS and `auth.uid()` see the authenticated learner.
- Supabase PostgreSQL stores versioned lessons, lesson attempts, learner progress, idempotent progress events, and versioned Chart Dojo scenarios/attempts.
- Database functions calculate scores, feedback and XP. Clients cannot submit answer keys, XP, score or pass state.

## Environment setup
Copy `.env.example` to `.env.local` for Vite development. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optionally `VITE_TRADEQUEST_API_URL` (defaults to `http://localhost:4000`). Create `server/.env` for the API using the server variables in `.env.example`. Never commit actual environment files or expose a service-role key.

## Database setup (development only)
Apply in order:
1. `supabase/migrations/202610110001_m2_learner_progress.sql`
2. `supabase/migrations/202610110002_m2_progress_events_and_xp_guard.sql`
3. `supabase/migrations/202610110003_chart_dojo_progress_event.sql`
4. `supabase/migrations/202610110004_chart_dojo_attempt_history.sql`
5. `supabase/migrations/202610110005_repair_chart_dojo_attempt_history.sql` (safe, repeatable repair)
6. `supabase/migrations/202610110006_versioned_chart_dojo_scenarios.sql`
7. `supabase/seed/dev_spread_lesson.sql`

Migration 006 seeds three synthetic scenarios and creates a published-scenario read API. Authenticated learners can read published scenario prompts/choices, but not answer keys. Attempt records store the exact scenario version used. The first Chart Dojo XP milestone remains one-time per learner.

Configure Supabase Auth email confirmation and allowed redirect URLs for local and deployed origins. Test with at least two separate users. Verify RLS isolation, progress event idempotency, quiz attempt retries and XP awards in a disposable project before production use.

## Current scope
Account persistence covers the spread knowledge check, foundations lesson completion, risk calculator use, and Chart Dojo choice/feedback history. The database/API catalogue supports multiple versioned scenarios, while the current frontend still presents the original scenario experience. Anonymous demo progress remains local and separate. The API exposes an evidence-based mastery summary at `GET /v1/me/mastery`. It aggregates the learner's own Chart Dojo attempts, server-scored spread-basics quiz attempts, and the risk-calculator participation milestone. It recommends the least-practised Chart Dojo skill, uses positive-decision rate only to break practice-count ties, and labels sample confidence. Risk calculator use is explicitly treated as participation rather than proof of mastery. Production deployment and comprehensive multi-user database integration validation remain outstanding.

## Integration test setup
The API integration suite is opt-in and requires a running API plus two dedicated test accounts in a disposable Supabase project. Set `TRADEQUEST_RUN_INTEGRATION_TESTS=true`, `TRADEQUEST_TEST_API_URL`, `TRADEQUEST_TEST_USER_A_TOKEN`, and `TRADEQUEST_TEST_USER_B_TOKEN`, then run `npm test`. Keep these credentials out of committed files and CI logs. The suite checks scenario catalogue exposure without answer keys, attempt replay/conflict behaviour, cross-learner history isolation, lesson scoring/XP idempotency, milestone idempotency, and submission against a second scenario. Without all four variables, these integration tests are skipped.

## Next engineering priorities
1. Run the opt-in integration suite against a disposable Supabase project and two dedicated test accounts after applying migrations 001–006 and the lesson seed.
2. Wire the frontend to the scenario catalogue so learners can play scenarios 001–003 without hard-coded answer feedback.
3. Surface the mastery API in the Skill Tree and guide learners directly to the recommended synthetic practice scenario.\n4. Add validated multi-user integration coverage for combined mastery signals in a disposable Supabase project with two dedicated test accounts.
