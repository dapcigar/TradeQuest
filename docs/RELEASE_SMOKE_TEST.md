# TradeQuest release smoke test

Use this checklist after a deployment or a change to authentication, learner progress, Chart Dojo, journal storage, or browser-local data handling.

This is a **manual release check**, not proof of production readiness. Run it against a disposable/test environment with two dedicated test accounts. Do not use personal learner records or production credentials for write-heavy checks. Record the deployment URL, commit SHA, environment, tester, date, and pass/fail evidence. Never paste passwords, access tokens, journal text, or secrets into the evidence.

## Before starting

- [ ] Confirm the target URL and environment are the intended test environment.
- [ ] Confirm the deployed commit matches the commit under review.
- [ ] Confirm migrations and seed data are applied only to the disposable/test Supabase project, following [the production-readiness gates](./PRODUCTION_READINESS.md).
- [ ] Confirm two dedicated test accounts exist (Account A and Account B).
- [ ] Open browser developer tools and watch for uncaught errors; do not copy sensitive request headers or response bodies into a report.
- [ ] Test at a narrow mobile viewport and a desktop viewport. Complete the key path using a keyboard as well as a pointer.

## Core learner path

### 1. Public and anonymous experience

- [ ] The app loads without a fatal error and navigation links open the expected screens.
- [ ] Synthetic scenarios are clearly identified as synthetic; no screen implies live prices or broker execution.
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
- [ ] Refresh/reopen the saved session and confirm the revealed candle history and final outcome persist.
- [ ] As Account B, attempt to open Account A's session by ID and confirm it is not found; confirm Account A's sessions do not appear in B's history.
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

## Accessibility and responsive checks

- [ ] Navigate the main menu, forms, filters, and confirmation actions using only Tab, Shift+Tab, Enter, Space, and Escape where appropriate.
- [ ] Focus remains visible and moves sensibly when dialogs or confirmation panels open and close.
- [ ] Inputs have accessible names; validation errors and save/import/delete outcomes are announced by assistive technology.
- [ ] Use a screen reader to verify page headings, navigation landmarks, progress values, and status messages.
- [ ] Check contrast, zoom/reflow, touch target size, and long text at mobile widths.
- [ ] Enable reduced motion and confirm no essential information depends on animation.

## Evidence and release decision

Record each check as **Pass**, **Fail**, **Blocked**, or **Not run**. Include concise steps to reproduce failures and a redacted screenshot or log excerpt where useful.

A green unit/build CI run does not prove these manual checks passed, and this checklist does not replace the opt-in two-account integration suite. Before any production database change, verify migration integrity, RLS/grants, idempotency, and cross-account isolation in a disposable Supabase project. Do not mark a check as passed unless it was actually executed.

Release blockers include any cross-account data exposure, incorrect server-authoritative scoring, duplicate rewards, leaked secrets, broken deletion/export boundaries, unclear synthetic-data labelling, or a critical keyboard/screen-reader failure.
