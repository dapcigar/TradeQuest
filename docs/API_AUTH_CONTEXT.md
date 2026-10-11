# API authentication context

Every protected request must verify the Supabase access token and use a request-scoped Supabase client carrying that same bearer token for all database/RPC calls. Token validation alone is insufficient: without forwarding the JWT, PostgreSQL RLS and `auth.uid()` may see an anonymous role or no learner identity.

## Rules
- Never use a service-role key for learner requests.
- Derive learner ID from Supabase Auth, never from the request body.
- Use the same request-scoped client for both identity verification and RLS-protected database operations.
- Keep the learner JWT out of logs and error responses.
- Integration-test two distinct users against a disposable Supabase project.
