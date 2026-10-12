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

Paper Trade Lab sessions are now stored in `paper_trade_sessions`. The API/database own plan validation, position-size calculation, candle progression, stop/target outcome, virtual equity after the session, and version checks. Learners can list and reopen their own saved sessions. Direct client writes to session rows are revoked; authenticated users have read access only to rows allowed by RLS, while database functions perform transitions under the verified learner identity.

Candle advancement accepts an expected version. A retry of the immediately preceding accepted version returns the recorded response instead of advancing twice; stale versions conflict. The response contains only candles through the current index. Session and history responses use `Cache-Control: no-store` where appropriate. The legacy signed replay endpoint remains separate and still requires a server-only `REPLAY_CURSOR_SECRET` of at least 32 characters.

The simulator now records an append-only **session state-transition ledger** (`session_started`, `candle_revealed`, and `session_closed`) and exposes each learner's own events. Retries of the same accepted version do not create duplicate events. This is not yet a full instrument-accurate order/fill ledger. It does not model contract-specific tick values, margin, pending orders, partial fills, commissions, spread, currency conversion, or ordinary slippage. The assumed one-unit P/L per fictional price unit is a teaching simplification, and planned risk is not a guaranteed maximum loss. Do not use simulated P/L as a mastery score or evidence of future performance.

## Before calling the simulator release-ready

1. Apply the paper-trade session migration and `20261012240000_paper_trade_ledger_events.sql` to a disposable Supabase project first; compare the migration ledger and run schema/grant/RLS checks.
2. Run the opt-in integration suite with two dedicated test accounts and confirm the tests actually ran rather than skipped.
3. Verify account A cannot read, change, or infer account B's sessions and that malformed, stale, concurrent, and replayed advancement requests cannot skip candles or duplicate outcomes.
4. Add independent fixtures for long and short plans, invalid directional prices, stop and target exits, same-candle ambiguity, adverse gaps, final-candle close, decimal rounding, and P/L reconciliation.
5. Decide and document instrument specifications and costs before supporting instrument-specific sizing, real order types, partial fills, or a full order/fill ledger.
6. Test sign-out/account switching, saved-session recovery, and error/loading states on mobile and desktop.
7. Keep the UI explicit that results are synthetic educational simulations, not broker records, live signals, or evidence of future performance.

## Safety statement

This feature is educational only. It does not connect to a broker, execute real trades, provide a live signal, or predict real trading performance.
