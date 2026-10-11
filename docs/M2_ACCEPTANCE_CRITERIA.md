# M2 Acceptance Criteria — Supabase + Node

- Authenticated requests validate access tokens with Supabase Auth.
- Anonymous requests cannot read or submit learner progress.
- User A cannot read or mutate User B's attempts or progress.
- Lesson attempt requests reject unknown fields and invalid identifiers.
- Score and XP are computed server-side from a published, versioned answer key.
- XP reward and attempt record commit atomically.
- Retrying the same attempt ID with identical content returns the original result without duplicate XP.
- Reusing an attempt ID with different content is rejected.
- Client cannot supply XP, score, pass state or mastery.
- Answer keys are not available to client roles.
- Tests cover RLS and transaction/idempotency behavior against a disposable Supabase database.
- No service-role secret is committed or sent to the frontend.
- Demo mode remains labelled until authenticated persistence is integrated.
- No live feeds, broker connections, payments or real-money execution.
