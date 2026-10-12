# Paper Trade Lab: behaviour and boundaries

## Current behaviour

The Paper Trade Lab is a short, synthetic learning exercise. The learner chooses a long or short direction, fictional entry/stop/target prices, virtual equity, risk percentage, and a user-defined execution model. The API calculates lot-step-aware position size and estimated margin/stop loss, then reveals only one candle per request.

- Candle values are hard-coded fictional units, not live or licensed historical market data.
- The API signs continuation tokens with the server-only `REPLAY_CURSOR_SECRET` and binds them to the authenticated learner.
- The client receives the current candle and the signed continuation token, not the future candle sequence.
- Position size is calculated from user-defined tick value, spread, per-side commission/slippage and lot increment; leverage/contract size cap the estimated margin. The default generic model retains one account-currency unit per fictional price unit.
- The exercise assumes an immediate market-style entry; the fill ledger records effective prices after the configured half-spread and per-side slippage. It models an estimated margin requirement but not margin calls/liquidation, pending orders, or partial fills.
- If stop and target are touched in the same candle, the stop is assumed first. For an adverse gap beyond the stop, the simulated exit uses the candle open. A target touch uses the target price.
- Spread, commission and slippage are included only according to the user-defined model; the default model sets them to zero. Currency conversion and gap-through loss are not modelled. Planned risk is not a guaranteed maximum loss.
- If neither stop nor target is reached by the final candle, the session closes at the final candle close as a teaching-only end-of-sequence rule.

## Persistence and replay boundary

Paper Trade Lab sessions are now stored in `paper_trade_sessions`. The API/database own plan validation, position-size calculation, candle progression, stop/target outcome, virtual equity after the session, and version checks. Learners can list and reopen their own saved sessions. Direct client writes to session rows are revoked; authenticated users have read access only to rows allowed by RLS, while database functions perform transitions under the verified learner identity.

Candle advancement accepts an expected version. A retry of the immediately preceding accepted version returns the recorded response instead of advancing twice; stale versions conflict. The response contains only candles through the current index. Session and history responses use `Cache-Control: no-store` where appropriate. The legacy signed replay endpoint remains separate and still requires a server-only `REPLAY_CURSOR_SECRET` of at least 32 characters.

The simulator records an append-only **session state-transition ledger** (`session_started`, `candle_revealed`, and `session_closed`) and exposes each learner's own events. Retries of the same accepted version do not create duplicate events. A separate append-only simulated fill ledger records one assumed immediate entry fill and, on closure, one exit fill with side, price, units, exit reason, and reconciled realised simulated P/L. The database trigger creates these records transactionally with the session start/closure; uniqueness constraints prevent duplicate entry or exit fills, and learner clients have read-only access to their own rows. Existing sessions are backfilled by the migration. This is still not a full instrument-accurate order/fill ledger. It does not model contract-specific tick values, margin, pending orders, partial fills, commissions, spread, currency conversion, or ordinary slippage. The assumed one-unit P/L per fictional price unit is a teaching simplification, and planned risk is not a guaranteed maximum loss. Do not use simulated P/L as a mastery score or evidence of future performance.

## User-defined execution assumptions

The plan form accepts a user-defined synthetic model; it does not select or verify a real instrument profile.

- `tickSize`: price movement represented by one tick.
- `tickValue`: virtual account-currency value per tick per unit.
- `contractSize`: used for the estimated margin calculation; it does not multiply tick-value P/L.
- `lotStep`: the minimum quantity increment. Position size is rounded down to this step.
- `spreadTicks`: total round-trip spread in ticks.
- `commissionPerUnit`: commission per unit per side.
- `slippageTicks`: slippage in ticks per side.
- `leverage`: used only for the margin estimate.

The server calculates:

```text
lossPerUnit = ((abs(entry - stop) / tickSize)
               + spreadTicks + 2 * slippageTicks) * tickValue
              + 2 * commissionPerUnit

units = floor((riskBudget / lossPerUnit) / lotStep) * lotStep
estimatedStopLoss = units * lossPerUnit
marginRequired = entry * contractSize * units / leverage
```

The server caps quantity to available virtual equity/margin and rejects plans that cannot fit the configured lot step and risk budget. Effective entry/exit fill prices include half the round-trip spread plus per-side slippage; commissions are deducted from realised P/L. The fill ledger records those effective prices and the same server-calculated P/L. Existing sessions are backfilled with the generic zero-cost model so their historical fills remain unchanged.

**Limitations:** the default `Generic price-unit model` is a neutral fictional baseline, not a verified XAUUSD, FX, index, futures, or CFD specification. Tick values, contract size and costs are only as accurate as the values entered by the learner. Planned stop-loss estimates exclude gap-through risk; a gap can produce a larger loss than the budget. The simulator still has no pending orders, partial fills, margin calls/liquidation, live prices, or broker connectivity.

## Before calling the simulator release-ready

Apply `20261012290000_paper_trade_execution_assumptions.sql` after the paper-trade session and fill-ledger migrations. It backfills existing sessions to the zero-cost generic model, preserving historical fills. Run the custom-cost integration case against the connected test project and verify the entry/exit fill ledger, margin/risk constraints, export fields, and account isolation.

1. Apply the paper-trade session migration, `20261012240000_paper_trade_ledger_events.sql`, and `20261012250000_paper_trade_fill_ledger.sql` to a disposable Supabase project first; compare the migration ledger and run schema/grant/RLS checks.
2. Run the opt-in integration suite with two dedicated test accounts and confirm the tests actually ran rather than skipped.
3. Verify account A cannot read, change, or infer account B's sessions and that malformed, stale, concurrent, and replayed advancement requests cannot skip candles or duplicate outcomes.
4. Add independent fixtures for long and short plans, entry/exit fill side, fill idempotency, invalid directional prices, stop and target exits, same-candle ambiguity, adverse gaps, final-candle close, decimal rounding, and fill/session P/L reconciliation.
5. User-defined tick/cost/lot/margin assumptions are supported for education, but they are not verified instrument specifications. Agree and source official instrument presets before describing a profile as instrument-accurate or adding pending orders, partial fills, liquidation, or broker-like execution.
6. Test sign-out/account switching, saved-session recovery, and error/loading states on mobile and desktop.
7. Keep the UI explicit that results are synthetic educational simulations, not broker records, live signals, or evidence of future performance.

## Safety statement

This feature is educational only. It does not connect to a broker, execute real trades, provide a live signal, or predict real trading performance.
