# Account Persistence — Decision Brief

## Goal
Replace browser-local demo progress with account-linked progress without treating client-provided XP or mastery as trusted facts.

## Recommended direction
Use a managed PostgreSQL database with a small typed API service. Keep lesson catalogue content versioned and deployable separately from learner state. Select the concrete identity provider and hosting only after reviewing existing repository/deployment constraints.

## Minimum data model
- `profiles`: internal user ID, display name, created/updated timestamps.
- `lesson_versions`: immutable content version, publication status, learning objectives.
- `lesson_attempts`: user ID, lesson version, attempt ID, answers, score, started/completed timestamps.
- `skill_mastery`: user ID, skill key, evidence count, last assessed, derived mastery level.
- `xp_events`: user ID, idempotency key, event type, validated award, server timestamp.
- `progress_projection`: derived totals for fast dashboard reads; rebuildable from authoritative events.

## Trust boundaries
- Client submits answers and interaction events, never an authoritative XP total.
- API validates event schema, lesson version, attempt ownership, rate limits and allowed award rules.
- XP award and idempotency record commit in one database transaction with a unique constraint on (user_id, idempotency_key).
- Mastery is derived from versioned assessment evidence and a documented rubric; a single click must not grant mastery.
- Administrative and editorial actions are audited.

## Privacy and security
- Collect only fields needed for accounts, progress and abuse prevention.
- Provide export and account deletion paths before public launch.
- Do not store broker credentials or enable real-money execution in the learning MVP.
- Apply per-user authorization at every API operation and test cross-account access denial.
- Keep secrets server-side and use environment variables/managed secret storage.

## Migration plan
1. Introduce a versioned API contract and database migrations.
2. Add identity and server-side session handling.
3. Write progress events to server transactionally and return server-calculated totals.
4. Offer a one-time, explicitly labelled import of demo-local progress; treat all imported values as unverified hints, not earned rewards.
5. Remove XP-awarding client logic after server flows are proven.
6. Test logout, account switching, offline/retry behavior, idempotency, deletion, export and authorization boundaries.

## Explicit non-goals
No live market feed, broker integration, deposits, real-money trading or AI-generated live trading signals.
