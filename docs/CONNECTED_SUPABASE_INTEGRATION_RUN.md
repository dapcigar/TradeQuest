# Connected Supabase integration run confirmation — 12 October 2026

This branch is the explicitly named one-shot trigger for the connected-Supabase two-account integration workflow.

- Use only the configured dedicated test accounts in `TRADEQUEST_TEST_USER_A_TOKEN` and `TRADEQUEST_TEST_USER_B_TOKEN`.
- The suite deletes all saved learning data for Account A during the self-service deletion test and verifies Account B remains isolated.
- The workflow must stop before tests if any required secret is missing; secret values must never be logged.
- Do not reuse this branch for subsequent integration runs.
