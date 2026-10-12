# Account-backed adaptive practice — implementation plan

## Goal

Move Adaptive Practice history for signed-in learners from browser-only storage to account-owned, server-scored records. Keep anonymous demo practice browser-local and clearly label it as local. This closes the explicit P2 decision in `docs/PRODUCTION_READINESS.md` without implying that a small practice sample predicts real trading outcomes.

## Non-negotiable boundaries

- Synthetic teaching scenarios only; no live market feed, broker connection, or real-money execution.
- The server owns scenario answer keys, correctness, explanations, and persisted attempt timestamps.
- The client must never submit a score, positive/negative outcome, user ID, XP award, or answer key.
- Every authenticated read/write is scoped to the verified learner JWT and protected by RLS.
- Repeated submissions with the same attempt ID are idempotent; reusing an ID with different content is rejected.
- Existing browser-local history must not be silently uploaded or merged into an account. Provide an explicit, reviewable migration/export path in a later task if needed.
- Never apply a migration to production as part of this work. Validate in a disposable Supabase project first.

## Implementation sequence

1. Add a versioned adaptive-scenario catalogue and private attempt table with RLS. Keep answer keys server-only.
2. Add a server-scored submission function and learner-scoped API routes. Use a stable attempt UUID for retries.
3. Update Adaptive Practice to load server-authored variants and save attempts for signed-in learners. Keep anonymous mode local.
4. Derive recall/transfer evidence from persisted server attempts for signed-in learners; do not mix local and account histories.
5. Add schema/policy tests, input-validation tests, idempotency tests, and two-account isolation coverage.
6. Update README and production-readiness notes to distinguish implemented behaviour from environment-dependent validation.

## Acceptance criteria

- Authenticated learners see their own adaptive history after sign-in on another device.
- Learner A cannot read, update, delete, or infer learner B's attempts.
- Correctness and feedback are computed from server-owned answer keys; forged outcome fields are rejected.
- Replaying a request with the same attempt ID cannot create a duplicate record.
- Anonymous practice continues to work without sign-in and stays separate from account data.
- Unknown scenario/choice IDs, oversized payloads, and user-ID injection are rejected.
- Unit tests, frontend build, API build, and CI pass.
- Live integration tests are only reported as passed when run against a disposable Supabase environment with two dedicated test accounts.
