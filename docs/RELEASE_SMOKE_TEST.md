# TradeQuest release smoke test

Use this checklist after a deployment or a change to authentication, learner progress, Chart Dojo, journal storage, or browser-local data handling.

This is a **manual release check**, not proof of production readiness. Run it against the repository's configured Supabase/API environment with two dedicated test accounts. Do not use personal learner records or production learner accounts for write-heavy checks. The integration suite deletes all saved learning data for Account A and verifies Account B's data remains intact. Record the deployment URL, commit SHA, environment, tester, date, and pass/fail evidence. Never paste passwords, access tokens, journal text, or secrets into the evidence.

## Automated read-only API smoke check

Before the browser-based checklist, run the automated check against the intended API deployment:

```bash
TRADEQUEST_SMOKE_API_URL=https://your-test-api.example npm run api:smoke
```

The command checks that `GET /health` returns the expected TradeQuest API identity, that defensive response headers are present, and that selected learner-only endpoints return HTTP 401 without a bearer token. It uses GET requests only, does not sign in, and does not create, modify, export, or delete learner records. It exits non-zero on a failed assertion or network/timeout error.

This check is intentionally narrow: it does not prove database migration status, authenticated account isolation, rate-limit behaviour, browser accessibility, or successful learner journeys. Those remain separate release gates. Do not run it against an unintended URL; the supplied URL must be the API origin/base path, without credentials, query strings, or fragments.

## Before starting

- [ ] Confirm the configured API URL targets the intended Supabase-backed environment and both bearer tokens belong to dedicated test accounts.
- [ ] Confirm the deployed commit matches the commit under review.
- [ ] Confirm migrations and seed data are applied only to the disposable/test Supabase project, following [the production-readiness gates](./PRODUCTION_READINESS.md).
- [ ] Confirm two dedicated test accounts exist (Account A and Account B).
- [ ] Open browser developer tools and watch for uncaught errors; do not copy sensitive request headers or response bodies into a report.
- [ ] Test at a narrow mobile viewport and a desktop viewport. Complete the key path using a keyboard as well as a pointer.

## Core learner path

### 1. Public and anonymous experience

- [ ] The app loads without a fatal error and navigation links open the expected screens.
- [ ] Synthetic scenarios are clearly identified as synthetic; no screen implies live prices or broker execution.
- [ ] Review changed learning content against docs/CONTENT_REVIEW_REGISTER.md; confirm no placeholders, missing tests, or unlabelled synthetic examples, and record human editorial sign-off separately.
- [ ] Adaptive Practice and the weekly plan explain that their records are stored in this browser.
- [ ] Anonymous Decision Journal demo records remain separate from authenticated account records.
- [ ] Search the glossary, change a category, and confirm the result count and empty state update.

### 2. Authentication and session handling

- [ ] Sign in as Account A with the test credentials.
- [ ] Refresh the page and confirm the signed-in state is restored appropriately.
- [ ] Sign out and confirm account-only screens return to their signed-out state.
- [ ] Try an unauthenticated API request to a protected learner endpoint and confirm it is rejected without exposing private data.
- [ ] Repeat sign-in and sign-out using Account B.

### 3. Lessons, risk calculator, and Chart Dojo

- [ ] Complete the spread-basics lesson assessment and verify feedback matches the selected answer.
- [ ] Submit a malformed or unsupported answer through the supported test path and confirm the API rejects it safely.
- [ ] Use the risk calculator with a valid example and boundary/invalid inputs; confirm invalid inputs do not produce misleading results.
- [ ] Load a Chart Dojo scenario and submit an answer. Confirm the result and rationale come from the server for authenticated practice.
- [ ] Refresh and confirm the expected saved attempt history remains available.
- [ ] Verify a retry does not duplicate XP or milestone rewards.
- [ ] Confirm no answer key, privileged secret, or service-role credential is exposed in browser assets or API responses.

### 4. Private journal and account isolation

- [ ] As Account A, create a journal entry with a non-sensitive test-only note, edit it, reload, and delete it.
- [ ] As Account B, confirm Account A's journal entry cannot be listed, opened by ID, edited, or deleted.
- [ ] Confirm Account A likewise cannot access Account B's entries.
- [ ] Verify API-level access controls, not just whether the UI hides another learner's data.
- [ ] Confirm journal entries do not appear in public pages, glossary results, or leaderboards.

### 5. Paper Trade Lab persistence and isolation

- [ ] Apply the paper-trade migration only in the disposable/test Supabase project and verify its version is recorded.
- [ ] As Account A, start a clearly labelled synthetic session and confirm the initial response contains only the first revealed candle.
- [ ] Advance one candle and retry the same expected version; confirm the retry returns the same response and does not advance twice.
- [ ] Inspect the session event ledger: it records session start, each accepted candle transition, and session closure in sequence; retrying a step does not duplicate events.
- [ ] Inspect the simulated fill ledger: exactly one entry fill is recorded at the assumed entry price, and exactly one exit fill is recorded at closure with the opposite side, exit price, reason, and reconciled simulated P/L.
- [ ] Confirm fill rows are read-only to learners, private to the owning account, included in that account's export, and removed only when the owning session is deleted.
- [ ] Verify community profiles are private by default; publish one with a dedicated test account and confirm only handle, display name, and bio appear in the directory, then opt out and confirm it disappears.
- [ ] Submit a private community reflection linked to a saved Chart Dojo attempt and reconcile the outcome/rubric result against the server-scored attempt; confirm the learner cannot supply a score.
- [ ] Submit a public reflection with an opted-in profile and confirm it remains hidden while pending, appears only after moderator approval, and disappears when the profile is made private.
- [ ] Verify reports are private, an ordinary learner receives 403 from moderation endpoints, each moderation action requires a reason and creates an audit record, and cross-account entry deletion does not remove another learner's entry.
- [ ] Verify account export includes the signed-in learner's community profile/entries/reports and learning-data deletion removes those records while preserving moderation audit history.
- [ ] Confirm the final ledger event records the simulated outcome and post-session virtual equity without exposing an internal learner ID.
- [ ] Refresh/reopen the saved session and confirm the revealed candle history and final outcome persist.
- [ ] As Account B, attempt to open Account A's session, event ledger, and fill ledger by ID and confirm all are not found; confirm Account A's sessions do not appear in B's history.
- [ ] Submit invalid directional prices and malformed session IDs; confirm the API rejects them without creating a session.
- [ ] Complete a session and inspect stop/target handling, same-candle stop-first ambiguity, adverse-gap handling, final-candle close, and the displayed P/L assumptions.
- [ ] Confirm the UI says synthetic/fictional and does not imply broker execution, live data, or predictive performance.

### 6. Review queue and adaptive practice

- [ ] Open the review queue as an authenticated learner and confirm its recommendation is based on returned saved practice evidence.
- [ ] Check that a learner with little or no practice is not described as having proven mastery.
- [ ] Complete an Adaptive Practice exercise and confirm its browser-local history is described as local evidence, not server-derived mastery.
- [ ] Refresh the page and confirm the expected local history persists in the same browser.
- [ ] Confirm Account A's private server records are not shown in Account B's session.

### 7. Weekly plan, export, restore, and deletion

- [ ] Select each supported weekly target (3, 5, and 7 sessions); record a session and undo it.
- [ ] As Account A, change the weekly target and record a session; refresh and confirm the plan persists from the server.
- [ ] As Account B, confirm Account A's target and session dates are not shown. Sign out and confirm the anonymous plan remains browser-local and separate.
- [ ] Export browser-local learning data and inspect the file for the expected allowlisted categories only.
- [ ] While signed in as Account A, export server-stored account learning data and confirm it includes only Account A's progress, attempts, private journal entries, and saved paper sessions.
- [ ] Confirm the account export contains no authentication tokens, passwords, service-role credentials, or Account B records, and the response uses `Cache-Control: no-store`.
- [ ] Confirm an export that exceeds the supported size limit fails clearly rather than returning a partial file.
- [ ] In the disposable environment, sign in as Account A, type `DELETE_MY_LEARNING_DATA`, and confirm only Account A's saved learning rows are deleted; Account A remains signed in and Account B's records remain intact.
- [ ] Confirm server-data deletion does not clear browser-local practice data or delete the Supabase Auth identity; use the separate local-data control to clear browser records if desired.
- [ ] Confirm the export contains no authentication tokens, passwords, server journal entries, or unrelated browser storage.
- [ ] Restore a valid test export and verify that only included, allowlisted local categories are replaced.
- [ ] Try an oversized or malformed export and confirm it is rejected with a clear message.
- [ ] Use the two-step clear flow and confirm only the weekly plan, adaptive practice history, and demo journal keys are removed.
- [ ] Confirm account-saved journal entries, authentication data, and unrelated browser storage remain untouched.

## Security headers and abuse controls

- [ ] Inspect the deployed frontend root response for the expected Content Security Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
- [ ] Inspect the deployed API health response and a malformed JSON response for defensive API headers; confirm HSTS appears only on the production HTTPS deployment.
- [ ] Confirm the CSP allows only the documented frontend dependencies and API/Supabase origins; do not add wildcard script sources.
- [ ] Verify the authenticated per-instance rate limit returns 429 and Retry-After when exceeded in a test environment.
- [ ] Separately verify a shared provider firewall/rate limit is configured if the app is exposed to external learners; the in-memory API limiter is not a global quota.

## Accessibility and responsive checks

- [ ] Tab from page load and activate Skip to main content; confirm focus moves to the main landmark.
- [ ] Change views from the navigation and from an in-page card; confirm focus moves to the labelled main landmark and the new page heading is discoverable.
- [ ] Navigate the main menu, forms, filters, and confirmation actions using only Tab, Shift+Tab, Enter, Space, and Escape where appropriate.
- [ ] Open the mobile menu and verify aria-expanded changes, the control relationship is announced, the active page is identified, and the close action remains reachable.
- [ ] Focus remains visible and moves sensibly when dialogs or confirmation panels open and close.
- [ ] Inputs have accessible names; validation errors and save/import/delete outcomes are announced by assistive technology.
- [ ] Use a screen reader to verify page headings, navigation landmarks, progress values, and status messages.
- [ ] Check contrast, zoom/reflow at 200% and 320 CSS-pixel width, touch target size, and long text at mobile widths.
- [ ] Enable reduced motion and confirm no essential information depends on animation.

See docs/ACCESSIBILITY.md for the full manual audit checklist and evidence fields.

## Evidence and release decision

Record each check as **Pass**, **Fail**, **Blocked**, or **Not run**. Include concise steps to reproduce failures and a redacted screenshot or log excerpt where useful.

A green unit/build CI run does not prove these manual checks passed, and this checklist does not replace the opt-in two-account integration suite. Before any production database change, verify migration integrity, RLS/grants, idempotency, and cross-account isolation in a disposable Supabase project. Do not mark a check as passed unless it was actually executed.

Release blockers include any cross-account data exposure, incorrect server-authoritative scoring, duplicate rewards, leaked secrets, broken deletion/export boundaries, unclear synthetic-data labelling, or a critical keyboard/screen-reader failure.
