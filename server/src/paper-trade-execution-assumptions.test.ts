import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261012290000_paper_trade_execution_assumptions.sql'), 'utf8');

describe('paper-trade execution assumptions migration contract', () => {
  it('persists bounded user-defined execution assumptions and backfills existing sessions', () => {
    expect(migration).toMatch(/add column if not exists instrument_label text not null/i);
    expect(migration).toMatch(/add column if not exists tick_size numeric not null default 1/i);
    expect(migration).toMatch(/add column if not exists tick_value numeric not null default 1/i);
    expect(migration).toMatch(/add column if not exists lot_step numeric not null default 0\.01/i);
    expect(migration).toMatch(/add column if not exists spread_ticks numeric not null default 0/i);
    expect(migration).toMatch(/add column if not exists commission_per_unit numeric not null default 0/i);
    expect(migration).toMatch(/add column if not exists slippage_ticks numeric not null default 0/i);
    expect(migration).toMatch(/add column if not exists leverage numeric not null default 1/i);
    expect(migration).toMatch(/set estimated_stop_loss = units \*/i);
    expect(migration).toMatch(/margin_required = entry_price \* contract_size \* units \/ leverage/i);
  });

  it('sizes to the lot step and limits risk and margin before creating a session', () => {
    expect(migration).toMatch(/v_loss_per_unit := \(\(pg_catalog\.abs\(p_entry - p_stop\) \/ p_tick_size\) \+ p_spread_ticks \+ 2 \* p_slippage_ticks\) \* p_tick_value/i);
    expect(migration).toMatch(/2 \* p_commission_per_unit/i);
    expect(migration).toMatch(/pg_catalog\.floor\(\(v_risk_budget \/ v_loss_per_unit\) \/ p_lot_step\) \* p_lot_step/i);
    expect(migration).toMatch(/pg_catalog\.floor\(\(p_virtual_equity \* p_leverage \/ \(p_entry \* p_contract_size\)\) \/ p_lot_step\) \* p_lot_step/i);
    expect(migration).toMatch(/v_margin_required > p_virtual_equity or v_estimated_stop_loss > v_risk_budget/i);
  });

  it('refreshes legacy cached responses on replay without advancing a session', () => {
    expect(migration).toMatch(/v_session\.last_response #>> '\{position,instrumentSpec\}' is null/i);
    expect(migration).toMatch(/update public\.paper_trade_sessions set last_response = v_response where id = p_session_id/i);
  });

  it('uses effective fill prices for P/L and records the same prices in the fill ledger', () => {
    expect(migration).toMatch(/v_entry_fill_price := v_session\.entry_price \+ v_direction_factor \* v_execution_cost_ticks \* v_session\.tick_size/i);
    expect(migration).toMatch(/v_exit_fill_price := v_exit_price - v_direction_factor \* v_execution_cost_ticks \* v_session\.tick_size/i);
    expect(migration).toMatch(/v_pnl := \(\(v_exit_fill_price - v_entry_fill_price\) \/ v_session\.tick_size\) \* v_session\.tick_value \* v_session\.units \* v_direction_factor/i);
    expect(migration).toMatch(/'exitPrice',coalesce\(v_session\.exit_fill_price,v_session\.exit_price\)/i);
    expect(migration).toMatch(/v_entry_fill_price, new\.units/i);
    expect(migration).toMatch(/new\.exit_fill_price, new\.units, new\.pnl/i);
    expect(migration).toMatch(/exclude adverse gap-through/i);
  });
});
