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
- Authenticated progress events persist completion of the foundations lesson and first use of the risk calculator; event rewards are selected server-side and awarded once per learner.
- Anonymous demo progress remains separate from account progress.

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
2. Apply `supabase/migrations/202610110001_m2_learner_progress.sql`.
3. Apply `supabase/migrations/202610110002_m2_progress_events_and_xp_guard.sql`.
4. Apply `supabase/seed/dev_spread_lesson.sql`.
5. Start the API and Vite frontend and test with two separate test accounts.

Do not apply migrations to production until the SQL, row-level security, RPC idempotency, and multi-user isolation have been validated in a disposable project.

## Validation

```bash
npm run test
npm run build
npm run api:build
```

See `docs/IMPLEMENTATION_BRIEF.md` for product direction and `docs/M2_IMPLEMENTATION_PLAN.md` for the current account-persistence setup.
