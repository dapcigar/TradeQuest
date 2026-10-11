# M2 — Account Persistence Acceptance Criteria

This milestone must not be called complete until all of the following pass:

- A learner can register, sign in, sign out and recover access through the selected identity provider.
- Progress is retrieved from the authenticated account on a second device/browser.
- A user cannot read or change another user's profile, attempts, progress or XP.
- XP events are server-calculated, bounded by published rules and idempotent under retries.
- Client-supplied totals, mastery and arbitrary event types are rejected or ignored.
- Database migrations run on a clean database and are tested against a documented rollback/forward strategy.
- Secrets are never exposed in frontend bundles or committed to the repository.
- Automated tests cover authorization denial, session expiry, duplicate event delivery and account deletion.
- Privacy notice, export and deletion flows are available before public release.
- The product continues to function without live market data and labels synthetic scenarios clearly.

## Deployment gate
Do not select or provision a production database, identity provider or paid service until the owner confirms hosting preferences, expected initial user volume, budget and privacy/compliance requirements.
