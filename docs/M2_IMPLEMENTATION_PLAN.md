# M2 — Supabase + Node.js implementation

## Decisions confirmed
- Supabase for database and managed authentication.
- Node.js / TypeScript API.
- £0 initial infrastructure budget; develop locally and use eligible free tiers without assuming they are permanently free.
- No live data, broker integration, paid AI dependency or real-money execution.

## Architecture (current repository)
- The frontend is React + Vite, not Next.js.
- The browser uses `@supabase/supabase-js` with a public/publishable key for managed email/password authentication and a persistent browser session.
- The Node/Express TypeScript API validates Supabase access tokens and forwards the learner JWT to a request-scoped Supabase client so RLS and `auth.uid()` work for that user.
- Supabase PostgreSQL stores versioned lessons, attempts, and learner progress.
- A database function computes score and XP from a published lesson version; the client cannot specify score, pass state or XP.

## Why the Next.js SSR snippet is not used
The supplied `@supabase/ssr`, `next/headers`, and Next.js middleware examples are designed for a Next.js App Router project. TradeQuest currently uses Vite and has no Next.js server rendering or middleware entry point. Adding those files unchanged would not run. If the product later migrates to Next.js, implement the official SSR cookie pattern as a separate architecture change. Do not add Next.js middleware to this Vite app.

## Environment
Copy `.env.example` to `.env.local` for Vite development (or use your host's environment settings):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TRADEQUEST_API_URL` (optional locally; defaults to `http://localhost:4000`)

The Node API needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT`, and `WEB_ORIGIN` in `server/.env`. Use the same Supabase project URL and its public/publishable key. Never put a service-role key in any `VITE_*` variable or commit actual environment files.

## Local setup
1. Install Node.js 20+ and run `npm install`.
2. Configure frontend `.env.local` and server `server/.env` using the examples.
3. Apply `supabase/migrations/202610110001_m2_learner_progress.sql` to a disposable development Supabase project.
4. Apply `supabase/seed/dev_spread_lesson.sql` after the migration to publish the first server-scored quiz.
5. Configure Supabase Auth email confirmation and allowed redirect URLs for local and deployed origins.
6. Run `npm run api:dev` and `npm run dev` in separate terminals.
7. Do not deploy or apply the migration to production until RLS, RPC, and multi-user integration tests pass.

## Current scope
Supabase Auth and account-backed scoring are being connected in increments. The spread knowledge check is the first server-persisted activity; lesson completion and risk-tool progress still need account sync. The UI keeps anonymous browser demo progress separate from account progress.
