# M2 — Supabase + Node.js implementation

## Decisions confirmed
- Supabase for database and managed authentication.
- Node.js / TypeScript API.
- £0 initial infrastructure budget; use local development and eligible free tiers without promising permanent free hosting.
- No live data, broker integration, paid AI dependency or real-money execution.

## Architecture
- React/Vite frontend.
- Node/Express TypeScript API verifies Supabase access tokens and validates lesson attempts.
- Supabase Auth handles identity; PostgreSQL stores progress.
- RLS restricts reads to the authenticated learner.
- A transactional database function computes score and XP from a published, versioned answer key; the client cannot specify score, pass state or XP.

## Security
- Never expose a service-role key to the frontend or use one in this API.
- Client roles cannot read answer keys or write attempt/progress rows directly.
- Test duplicate attempt IDs, retries, cross-user access and transaction rollback.
- Do not apply the migration to production until it has been reviewed and tested against a disposable Supabase project.

## Local setup
1. Install Node.js 20+ and npm.
2. Copy `server/.env.example` to `server/.env` and add the Supabase project URL and publishable/anon key.
3. Apply the SQL migration to a development project using the Supabase CLI.
4. Seed an editorially reviewed published lesson through a controlled admin process.
5. Run `npm install`, `npm run api:dev` and `npm run dev` in separate terminals.
6. Never commit environment files.

## Current scope
Backend foundation only. The demo frontend still uses browser-local progress. Auth UI, API client integration, seed/editorial workflow, integration tests and deployment remain follow-up work.
