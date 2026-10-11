# M2 — Supabase + Node.js implementation

## Decisions confirmed
- Database and managed identity: Supabase.
- Backend runtime: Node.js / TypeScript.
- Budget: £0 initially; use local development and eligible free tiers, with no promise of permanent free service.
- No live data, broker integration, paid AI dependency or real-money execution.

## Architecture
- React/Vite frontend.
- Node/Express TypeScript API for auth-token verification, input validation and attempt orchestration.
- Supabase Auth for identity and PostgreSQL for progress.
- Every protected request verifies the Supabase access token with Auth.
- PostgreSQL RLS restricts direct reads to the current learner.
- A transactional database function calculates score and XP from a published lesson's server-owned answer key; client payload cannot specify score, pass state or XP.

## Security conditions
- Never expose a service-role key in the browser or API environment.
- Lesson answer keys must not be readable by client roles.
- No direct client writes to progress/attempt tables.
- The database function must be tested for retries, duplicate attempt IDs, cross-user access and rollback.
- Production deploy is blocked until schema and RLS policies are applied to a dedicated Supabase project and verified.

## Local setup
1. Install Node.js 20+ and npm.
2. Copy `server/.env.example` to `server/.env` and fill in Supabase project URL and publishable/anon key.
3. Apply SQL migration with the Supabase CLI to a disposable development project.
4. Seed an editorially reviewed, published lesson through a controlled admin-only process before attempting submissions.
5. Run `npm install`, `npm run api:dev` and `npm run dev` in separate terminals.
6. Do not commit .env files.

## Free-tier caveats
Supabase limits and policies can change; projects may be paused or constrained. Set usage alerts where available, avoid collecting unnecessary personal data and review current provider terms before public launch.

## Current phase
Foundation only. The existing demo frontend still uses browser-local progress; migrating it to account-backed API calls is a separate integration task requiring auth UI, loading/error states and end-to-end tests.
