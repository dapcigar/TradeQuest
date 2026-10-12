# Paper Trade Lab: behaviour and boundaries

## Current behaviour

The Paper Trade Lab is a short, synthetic learning exercise. The learner chooses a long or short direction, fictional entry/stop/target prices, virtual equity, and a risk percentage. The API calculates the virtual position size and reveals only one candle per request.

- Candle values are hard-coded fictional units, not live or licensed historical market data.
- The API signs continuation tokens with the server-only `REPLAY_CURSOR_SECRET` and binds them to the authenticated learner.
- The client receives the current candle and the signed continuation token, not the future candle sequence.
- Position size is calculated as `risk budget / absolute entry-to-stop distance`, assuming one unit of account-currency P/L per fictional price unit.
- The exercise assumes an immediate fill at the supplied entry. It does not model pending orders, partial fills, margin, or contract-specific sizing.
- If stop and target are touched in the same candle, the stop is assumed first. For an adverse gap beyond the stop, the simulated exit uses the candle open. A target touch uses the target price.
- Fees, spread, currency conversion, and ordinary slippage are excluded. Planned risk is not a guaranteed maximum loss.
- If neither stop nor target is reached by the final candle, the session closes at the final candle close as a teaching-only end-of-sequence rule.

## Persistence and replay boundary

The session is temporary and stateless. No virtual balance, order, position, or outcome is written to Supabase. Because the continuation token is signed but not recorded in a server-side session store, a learner can replay an earlier valid token to fork a practice run. This is acceptable for the current isolated educational exercise, but it is **not** suitable for a leaderboard, authoritative progress record, audit trail, or persistent account ledger.

The API must continue to require an authenticated learner, verify token integrity and learner binding, set `Cache-Control: no-store`, and never include future candles in a response. The secret must remain server-only and contain at least 32 characters.

## Before expanding to a persistent simulator

1. Decide and document instrument specifications, tick/contract values, costs, order types, fill rules, gaps, and candle ambiguity policy.
2. Store sessions, orders, positions, fills, and ledger events server-side in a transactionally consistent model.
3. Make create/advance/close requests idempotent; reject stale session versions and replayed state transitions.
4. Add user-owned row-level security policies and verify cross-account read/write denial with two disposable test accounts.
5. Add independent fixtures for long and short trades, stop and target exits, same-candle ambiguity, adverse gaps, final-candle close, rounding, and ledger reconciliation.
6. Run integration tests against a disposable Supabase project before applying any migration to a production project.
7. Keep the UI explicit that simulated results are not evidence of future live performance and do not reward P/L alone.

## Safety statement

This feature is educational only. It does not connect to a broker, execute real trades, provide a live signal, or predict real trading performance.
