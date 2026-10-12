import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261012250000_paper_trade_fill_ledger.sql'), 'utf8');

describe('paper-trade fill-ledger migration contract', () => {
  it('keeps fills append-only for learner roles and scoped by owner RLS', () => {
    expect(migration).toMatch(/alter table public\.paper_trade_fills enable row level security/i);
    expect(migration).toMatch(/revoke all on public\.paper_trade_fills from public, anon, authenticated/i);
    expect(migration).toMatch(/grant select on public\.paper_trade_fills to authenticated/i);
    expect(migration).toMatch(/for select to authenticated using \(auth\.uid\(\) = user_id\)/i);
    expect(migration).toMatch(/revoke all on function public\.record_paper_trade_fill\(\) from public, anon, authenticated/i);
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete|all)\s+on\s+public\.paper_trade_fills\s+to\s+(?:anon|authenticated)/i);
  });

  it('records exactly one entry and one exit per session with direction-correct sides', () => {
    expect(migration).toMatch(/unique \(session_id, fill_sequence\)/i);
    expect(migration).toMatch(/unique \(session_id, fill_type\)/i);
    expect(migration).toMatch(/case when new\.direction = 'long' then 'buy' else 'sell' end/i);
    expect(migration).toMatch(/case when new\.direction = 'long' then 'sell' else 'buy' end/i);
    expect(migration).toMatch(/on conflict \(session_id, fill_type\) do nothing/i);
    expect(migration).toMatch(/old\.status <> 'closed' and new\.status = 'closed'/i);
  });

  it('fails a closing transaction if required outcome fields are missing', () => {
    expect(migration).toMatch(/new\.exit_price is null or new\.pnl is null or new\.exit_reason is null/i);
    expect(migration).toMatch(/raise exception 'Closed paper trade requires a reconciled exit fill'/i);
  });

  it('backfills existing open and closed sessions without changing their outcomes', () => {
    expect(migration).toMatch(/-- Backfill existing sessions without changing their state or outcomes\./i);
    expect(migration).toMatch(/from public\.paper_trade_sessions s\s+on conflict \(session_id, fill_type\) do nothing/i);
    expect(migration).toMatch(/where s\.status = 'closed'\s+and s\.exit_price is not null\s+and s\.pnl is not null\s+and s\.exit_reason is not null/i);
    expect(migration).not.toMatch(/update public\.paper_trade_sessions/i);
    expect(migration).not.toMatch(/delete from public\.paper_trade_sessions/i);
  });
});
