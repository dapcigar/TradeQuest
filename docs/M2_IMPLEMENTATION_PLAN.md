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
Account persistence covers the spread knowledge check, foundations lesson completion, risk calculator use, and Chart Dojo choice/feedback history. The frontend loads the published scenario catalogue and supports the three synthetic Chart Dojo scenarios. Anonymous demo progress remains local and separate. The API exposes an evidence-based mastery summary at `GET /v1/me/mastery`. It aggregates the learner's own Chart Dojo attempts, server-scored spread-basics quiz attempts, and the risk-calculator participation milestone. It recommends a skill for spaced review when its latest recorded Chart Dojo attempt is at least 14 days old; otherwise it recommends the least-practised skill and uses positive-decision rate only to break practice-count ties. The API reports each skill's latest practice timestamp and review status, and labels sample confidence. Missing or invalid timestamps never trigger a review-due state. Risk calculator use is explicitly treated as participation rather than proof of mastery. Production deployment and comprehensive multi-user database integration validation remain outstanding.

## Integration test setup
The API integration suite is opt-in and requires a running API plus two dedicated test accounts in a disposable Supabase project. Set `TRADEQUEST_RUN_INTEGRATION_TESTS=true`, `TRADEQUEST_TEST_API_URL`, `TRADEQUEST_TEST_USER_A_TOKEN`, and `TRADEQUEST_TEST_USER_B_TOKEN`, then run `npm test`. Keep these credentials out of committed files and CI logs. The suite checks scenario catalogue exposure without answer keys, attempt replay/conflict behaviour, cross-learner history isolation, lesson scoring/XP idempotency, milestone idempotency, submission against multiple scenarios, and combined mastery-signal isolation (Chart Dojo plus lesson attempts). It also verifies risk-calculator use remains participation-only. The combined mastery test compares both accounts before and after writing to account A. Without all four variables, these integration tests are skipped.

## Validation runbook

Run the ordinary checks from the repository root:

```bash
npm run test
npm run build
npm run api:build
```

For real database behaviour, use a **disposable Supabase project** and two dedicated test users; do not use production credentials or personal learner accounts.

1. Apply migrations 001–006 in order, then run `supabase/seed/dev_spread_lesson.sql`.
2. Configure `server/.env` with the disposable project's URL and public/anon key, then start the API with `npm run api:dev`.
3. Obtain fresh access tokens for test users A and B. Treat them as secrets and never commit them or print them in CI logs.
4. In a separate shell, set `TRADEQUEST_RUN_INTEGRATION_TESTS=true`, `TRADEQUEST_TEST_API_URL`, `TRADEQUEST_TEST_USER_A_TOKEN`, and `TRADEQUEST_TEST_USER_B_TOKEN`; run `npm test`.
5. Confirm the integration suite is not skipped and all cases pass. The tests write persistent attempts and progress events to the test database; recreate/reset the disposable users and database before repeating if a clean baseline is required.
6. Verify the two users cannot see each other's attempt history or mastery changes. Do not consider production ready until this has been run successfully.

The integration suite cannot prove live database isolation when it is skipped due to missing environment variables. Unit tests and builds are necessary but are not a substitute for this disposable-project run.

## Next engineering priorities

1. Execute the opt-in integration suite against a disposable Supabase project and record the results.
2. Expand server-authoritative exercise coverage and mastery only when each exercise has meaningful, validated signals.
3. Prepare a production-readiness review covering migration deployment, backups, auth redirect configuration, rate limiting, monitoring, and incident recovery.
