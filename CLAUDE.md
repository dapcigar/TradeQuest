# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` holds the binding product invariants and task workflow (free product, no live feeds, no real-money execution/signals/advice, never expose future candles or answer keys, account data isolation, a11y, don't claim unrun tests). Read it first; it is not repeated here. Product direction lives in `docs/IMPLEMENTATION_BRIEF.md`.

## Commands

Requires Node 20+. Root `package.json` covers both the frontend and the API (the `server/` folder has its own `tsconfig.json` and `.env.example` but is built from the root).

```bash
npm run dev          # Vite frontend (http://localhost:5173)
npm run api:dev      # Express API with tsx watch (http://localhost:4000)
npm run test         # vitest run (all tests, node environment)
npm run test:watch
npm run build        # tsc -b && vite build (frontend typecheck + bundle)
npm run api:build    # tsc -p server/tsconfig.json
npx vitest run src/risk.test.ts            # single test file
npx vitest run -t "name fragment"          # single test by name
```

CI (`.github/workflows/ci.yml`) runs `test`, `build`, `api:build`. There is no lint script.

Env: frontend vars (`VITE_*`) go in `.env.local`; API vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT`, `WEB_ORIGIN`) go in `server/.env`. Use the publishable/anon key only, never a service-role key.

## Architecture

Three layers; the learner's Supabase JWT ties them together.

- **Frontend (`src/`)**: React 18 + Vite SPA. `App.tsx` is the single large UI file; pure logic is split into `learning.ts` (lesson/scenario content and helpers), `risk.ts` (risk calculator math), `progress.ts` (progress state, anonymous demo progress kept separate from account progress), `supabase.ts` (browser auth client). Auth is Supabase email/password; the frontend calls the Express API with the access token.
- **API (`server/src/`)**: Express 5 + zod. `auth.ts` (`requireLearner`) verifies the bearer token and attaches a **request-scoped Supabase client carrying the learner's JWT**, so RLS and `auth.uid()` apply to every DB/RPC call. Routes are all in `index.ts` under `/v1/...` (progress, progress-events, mastery, chart-dojo scenarios/attempts, lesson-attempts). Request validation is in `schemas.ts`; `mastery.ts` computes the recommendation from stored attempts.
- **Database (`supabase/migrations/`)**: numbered timestamped SQL migrations (apply in order) plus `supabase/seed/dev_spread_lesson.sql`. Scoring, XP awards, idempotency (client-supplied `attemptId`) and the one-time milestone reward are enforced in Postgres RPCs/RLS, not in the client. Chart Dojo answer keys are server-only and must never be returned by the API.

Rules from `docs/API_AUTH_CONTEXT.md` that are easy to violate: derive the learner ID from the verified token, never the request body; use the same scoped client for identity check and DB calls; never log or echo the JWT.

## Testing notes

- Unit tests are colocated (`*.test.ts`) and run in vitest's default node environment (no jsdom, so no component tests).
- `server/src/chart-dojo.integration.test.ts` is skipped unless `TRADEQUEST_RUN_INTEGRATION_TESTS=true` plus `TRADEQUEST_TEST_API_URL`, `TRADEQUEST_TEST_USER_A_TOKEN`, `TRADEQUEST_TEST_USER_B_TOKEN` are set. It needs a running API against a **disposable** Supabase project with two dedicated test accounts; run via the manual `supabase-integration.yml` workflow. Do not apply migrations to production before validating SQL/RLS/idempotency there (see `docs/M2_IMPLEMENTATION_PLAN.md`, `docs/M2_ACCEPTANCE_CRITERIA.md`).

## Tooling

`.mcp.json` configures Supabase (scoped to the dev project) and Vercel MCP servers; Supabase agent skills are under `.claude/skills/`.
