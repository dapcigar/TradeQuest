# TradeQuest security architecture

## Trust boundaries

- The React/Vite application uses Supabase's public publishable key only. It must never receive a service-role key or database password.
- The Express API verifies the bearer token with Supabase Auth and creates a request-scoped Supabase client carrying that learner's JWT. Learner data queries must use the verified identity and database RLS.
- Server-scored assessments, progress rewards, and synthetic paper-trade transitions are computed by database functions/API code. Client-submitted scores, XP, outcome fields, and learner IDs are not authoritative.
- Private journals, attempts, progress, and paper-trade sessions must remain account-scoped. Cross-account integration tests require two dedicated disposable test accounts.
- Browser-local weekly plans, anonymous practice, and demo journal entries are distinct from server-saved account records.

## Browser security policy

The Vercel frontend configuration sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and a Content Security Policy. The frontend policy currently permits same-origin scripts, inline styles needed by the existing UI, Google Fonts, Supabase API calls, and the TradeQuest API. Any new external script, image, font, or API origin must be reviewed before adding it to the policy.

The API sends defensive headers on all responses, including a deny-by-default CSP suitable for JSON endpoints. HSTS is emitted only in production.

## Rate limits and operational constraints

The API's in-memory fixed-window limiter allows up to 60 authenticated requests per learner per 60-second window per serverless instance. It is a burst guard, **not a global quota**: requests distributed across instances can exceed the effective limit. The provider firewall/shared rate-limit configuration must be reviewed and tested before inviting external learners. Do not describe the in-memory limiter as global protection.

Vercel deployment rate limits and Supabase free-tier capacity are external operational constraints. A successful build does not mean the latest commit is deployed, migrations are applied, or backups can be restored.

## Release verification

Before a production database change:

1. Identify the exact environment and reconcile the migration ledger.
2. Apply migrations to a disposable Supabase project first.
3. Run the opt-in integration suite with two dedicated accounts and verify it did not skip.
4. Verify RLS and grants directly, including deletion/export isolation.
5. Review secrets, auth redirects, rate limits, CSP origins, and error logging.
6. Exercise export, restore, self-service learning-data deletion, backup/restore, rollback, and keyboard/screen-reader flows.

Never log bearer tokens, request bodies, journal content, or other sensitive learner data. Self-service learning-data deletion does not delete the Supabase Auth identity or browser-local data; these are separate operations.
