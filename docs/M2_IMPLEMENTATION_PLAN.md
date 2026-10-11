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
- Supabase PostgreSQL stores versioned lessons, lesson attempts, learner progress and idempotent progress events.
- Database functions calculate scores and XP. Clients cannot send XP, score or pass state.

## Environment setup
Copy `.env.example` to `.env.local` for Vite development. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optionally `VITE_TRADEQUEST_API_URL` (defaults to `http://localhost:4000`). Create `server/.env` for the API using the server variables in `.env.example`. Never commit actual environment files or expose a service-role key.

## Database setup (development only)
Apply in order:
1. `supabase/migrations/202610110001_m2_learner_progress.sql`
2. `supabase/migrations/202610110002_m2_progress_events_and_xp_guard.sql`
3. `supabase/migrations/202610110003_chart_dojo_progress_event.sql`
4. `supabase/migrations/202610110004_chart_dojo_attempt_history.sql`
5. `supabase/seed/dev_spread_lesson.sql`

Configure Supabase Auth email confirmation and allowed redirect URLs for local and deployed origins. Test with at least two separate users. Verify RLS isolation, progress event idempotency, quiz attempt retries and XP awards in a disposable project before production use.

## Current scope
Account persistence covers the spread knowledge check, foundations lesson completion, risk calculator use, and Chart Dojo scenario choice/feedback history. Anonymous demo progress remains local and separate. Full adaptive mastery, production deployment and comprehensive multi-user database integration tests remain outstanding.

## Integration test setup
The Chart Dojo API integration suite is opt-in and requires a running API plus two dedicated test accounts in a disposable Supabase project. Set `TRADEQUEST_RUN_INTEGRATION_TESTS=true`, `TRADEQUEST_TEST_API_URL`, `TRADEQUEST_TEST_USER_A_TOKEN`, and `TRADEQUEST_TEST_USER_B_TOKEN`, then run `npm test`. Keep these credentials out of committed files and CI logs. The suite creates a uniquely identified test attempt for user A and checks replay idempotency, conflicting replay rejection, unauthenticated/malformed requests, and that user B cannot see user A's attempt. Without all four variables, these integration tests are skipped.

## Next engineering priorities
1. Run the opt-in integration suite against a disposable Supabase project and two dedicated test accounts.
2. Add equivalent integration coverage for lesson scoring and progress-event XP idempotency.
3. Persist multiple versioned Chart Dojo scenarios and evidence for adaptive mastery.
