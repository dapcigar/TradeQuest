# TradeQuest production runbook

This runbook is a checklist for an operator. It does not assert that a backup exists, a restore has been tested, or a deployment is live. Record evidence for each release in the release evidence record.

## 1. Pre-release checks

1. Identify the exact Git commit, GitHub PR, Vercel project/deployment, and Supabase project/branch. Never infer the target environment from a project display name alone.
2. Confirm GitHub Actions passed: tests, frontend build, API build, and release preflight.
3. Compare the local migration list with the target project's migration ledger. Review every new migration and run it against a disposable Supabase project first.
4. Run the opt-in integration suite with two dedicated test accounts. Confirm the tests ran rather than skipped.
5. Verify the deployed frontend and API headers, authentication redirects, account export/deletion, weekly plan sync, and paper-trade ledger.
6. Check Vercel deployment status and provider quotas. A rate-limited or failed deployment is not a release; do not repeatedly trigger builds while the provider's rate limit is active.
7. After deployment, set the GitHub Actions repository variable `TRADEQUEST_SMOKE_API_URL` to the intended deployed HTTPS API base URL. Run **Actions → Deployed API smoke (unauthenticated, no-write)** and explicitly confirm the no-write check. Capture the workflow URL and deployed commit as evidence. This check uses unauthenticated requests, carries no bearer tokens, and does not replace the Supabase integration suite or browser journey.

## 2. Backup before schema changes

- Prefer the backup and point-in-time recovery facilities actually available on the target Supabase plan. Confirm the retention window and restore procedure in the project dashboard; do not assume free-tier projects have automatic production-grade backups.
- If the target plan does not provide an adequate backup, use approved PostgreSQL backup tooling against the exact target database and capture the application schema/data before the migration. Determine whether the chosen method also preserves the authentication identities required by foreign keys; a public-schema dump alone is not a complete identity restore.
- Store backup artifacts encrypted and access-controlled outside the repository. Never commit database dumps, access tokens, passwords, connection strings, or journal contents.
- Record the backup timestamp, project reference, migration ledger version, operator, artifact location, and retention/expiry date.
- If a complete backup and restore path cannot be established, stop before a destructive or difficult-to-reverse migration.

## 3. Disposable two-account integration workflow

The manual GitHub Actions workflow **Disposable Supabase integration** runs the opt-in API suite without allowing the normal pull-request test job to silently count a skipped suite as a pass.

Before running it:

- Deploy the API against a disposable Supabase project with all migrations applied and required synthetic scenarios seeded.
- Create two dedicated test accounts. The suite deletes Account A's saved learning data at the end, so neither account may contain real learner data.
- Configure these repository Actions secrets: `TRADEQUEST_TEST_API_URL`, `TRADEQUEST_TEST_USER_A_TOKEN`, and `TRADEQUEST_TEST_USER_B_TOKEN`. Never paste token values into workflow inputs or logs.
- Name the test API host clearly as test/staging/preview (or use localhost); the workflow rejects production-looking hostnames.
- Run Actions → **Disposable Supabase integration** and explicitly confirm the disposable environment. A missing confirmation, secret, or non-production hostname causes the workflow to fail before running tests.
- Save the successful workflow run URL in the release evidence record. A skipped suite or missing credentials is not a successful isolation test.

## 4. Restore rehearsal

1. Restore the backup into a disposable Supabase project or other approved isolated target. Do not overwrite production to test recovery.
2. Confirm the schema and migration ledger, then verify the required environment variables and auth redirect settings for the isolated project.
3. Create two dedicated test users and run the opt-in integration suite. Verify account isolation for attempts, journals, weekly plans, exports, paper-trade sessions, and ledger events.
4. Run the manual smoke checklist, including keyboard-only navigation and narrow mobile layouts.
5. Record what was restored, what was not restored (including auth identity or storage objects if applicable), elapsed recovery time, errors, and the corrective actions.
6. A backup is not considered verified until the restore succeeds and application-level checks pass.

## 5. Deployment and rollback

- Prefer additive/expand-contract schema changes. Keep old columns/functions compatible until the previous application version is no longer deployed.
- Deploy code only after its required migrations are applied to the intended environment and validated. Never mark a migration as applied merely to silence a warning.
- If the frontend/API deployment fails, keep the last known-good deployment active and inspect the actual provider error. If a provider rate limit is reported, wait for the documented retry window or use the provider's supported resolution path.
- If an application regression occurs after a compatible additive migration, roll back to the last known-good application deployment and preserve the migration. Prefer a forward-fix over a speculative destructive down migration.
- If the schema change is incompatible or data is corrupted, stop writes where appropriate, follow the rehearsed restore plan, and verify data integrity before reopening access.

## 6. Incident response

1. Record the first observed time, affected environment, commit/deployment ID, symptoms, and user impact.
2. Check the frontend deployment, API health endpoint, GitHub Actions, Supabase service status, quotas, and migration ledger.
3. Avoid logging or sharing access tokens, passwords, service-role keys, database URLs, private journal text, or full learner exports.
4. For account-isolation concerns, restrict the affected route/feature, preserve relevant non-sensitive logs, and run cross-account tests in a disposable environment.
5. Communicate known limitations honestly. Do not claim that an export, backup, restore, migration, or deployment succeeded without evidence.

## 7. Release evidence record

For every release, record:

- Commit and PR links.
- CI run URL and result, including release-preflight output.
- Frontend and API deployment URLs/status.
- Supabase project reference, migration versions, and disposable-project test result.
- Backup artifact reference (never the secret contents) and last successful restore rehearsal.
- Manual smoke-test date, keyboard/screen-reader result, mobile result, and outstanding issues.
- Rollback plan and release approver.

## Current known boundaries

- The API's in-memory limiter is per serverless instance, not a global quota. A shared provider-level rate limit must be configured and verified before external launch.
- Paper Trade Lab is a synthetic educational simulator. Its append-only event history is not a full order/fill broker ledger, and instrument-specific costs, margin, and contract-accurate P/L are not implemented.
- Browser-local demo records are separate from server-saved account records. Account learning-data deletion does not delete the Supabase Auth identity or browser-local records.
