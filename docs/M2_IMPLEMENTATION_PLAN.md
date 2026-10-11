# M2 — Account Persistence Implementation Plan

## Phase 0: confirm deployment decisions
- Confirm identity provider, backend runtime/hosting, database, deployment target and budget.
- Confirm account data retention, export/deletion behavior and minimum privacy notice.
- Keep credentials and infrastructure changes out of the frontend-only prototype.

## Phase 1: API contract
- Define schemas for registration/session, profile, lesson attempts, progress query, XP events and deletion/export.
- Version routes and validate request/response contracts.
- Add explicit authorization requirements to every endpoint.

## Phase 2: persistence
- Add migrations and indexes for user IDs, lesson versions, attempt IDs and unique XP idempotency keys.
- Add repository/service boundaries; keep business rules out of route handlers.
- Use transactions for attempt completion, XP event insert and derived progress update.

## Phase 3: UI integration
- Add auth/loading/empty/error states and session expiry handling.
- Load progress after authentication; never treat browser storage as authoritative.
- Support retry-safe submissions and a clearly labelled demo mode if sign-in is not yet available.

## Phase 4: verification
- Unit tests for validation and award rules.
- Integration tests for auth, ownership, idempotency and transaction rollback.
- End-to-end tests for register → lesson → assessment → progress on a second session.
- Accessibility review for forms, focus, error announcements and password manager support.

## Deliverables
API contract, schema/migrations, identity integration, transactional XP service, test suite, privacy/export/delete UX, operational runbook and deployment notes.
