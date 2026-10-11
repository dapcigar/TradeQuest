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
3. `supabase/seed/dev_spread_lesson.sql`

Configure Supabase Auth email confirmation and allowed redirect URLs for local and deployed origins. Test with at least two separate users. Verify RLS isolation, progress event idempotency, quiz attempt retries and XP awards in a disposable project before production use.

## Current scope
Account persistence covers the spread knowledge check, foundations lesson completion and risk calculator use. Anonymous demo progress remains local and separate. Chart-dojo progress, full adaptive mastery, production deployment and comprehensive multi-user database integration tests remain outstanding.

## Next engineering priorities
1. Fix and test account progress/event API consistency.
2. Validate migrations and database functions against a disposable Supabase project.
3. Add API contract/integration tests for auth, RLS, retries and XP.
4. Complete remaining account-backed practice progress before moving on to community features.
