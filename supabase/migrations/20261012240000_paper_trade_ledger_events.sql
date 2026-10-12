-- Append-only state-transition history for persisted synthetic paper-trade sessions.
create table if not exists public.paper_trade_ledger_events (
  event_sequence bigint generated always as identity primary key,
  event_id uuid not null unique default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.paper_trade_sessions(id) on delete cascade,
  session_version integer not null check (session_version >= 0),
  event_type text not null check (event_type in ('session_started', 'candle_revealed', 'session_closed')),
  candle_index integer not null check (candle_index between 0 and 11),
  payload jsonb not null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique (session_id, session_version, event_type)
);

create index if not exists paper_trade_ledger_events_owner_session_idx
  on public.paper_trade_ledger_events(user_id, session_id, event_sequence);

alter table public.paper_trade_ledger_events enable row level security;
revoke all on public.paper_trade_ledger_events from public, anon, authenticated;
grant select on public.paper_trade_ledger_events to authenticated;
drop policy if exists "Learners read own paper trade ledger events" on public.paper_trade_ledger_events;
create policy "Learners read own paper trade ledger events" on public.paper_trade_ledger_events
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.record_paper_trade_ledger_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_payload := pg_catalog.jsonb_build_object(
      'scenarioId', new.scenario_id, 'direction', new.direction, 'entryPrice', new.entry_price,
      'stopPrice', new.stop_price, 'targetPrice', new.target_price, 'virtualEquity', new.virtual_equity,
      'virtualEquityAfter', case when new.status = 'closed' then new.virtual_equity + coalesce(new.pnl, 0) else null end,
      'riskPercent', new.risk_percent, 'riskBudget', new.risk_budget, 'units', new.units,
      'currentIndex', new.current_index, 'status', new.status, 'exitPrice', new.exit_price,
      'exitReason', new.exit_reason, 'pnl', new.pnl, 'version', new.version
    );
    insert into public.paper_trade_ledger_events
      (user_id, session_id, session_version, event_type, candle_index, payload)
    values (new.user_id, new.id, new.version, 'session_started', new.current_index, v_payload)
    on conflict (session_id, session_version, event_type) do nothing;
  elsif tg_op = 'UPDATE' and new.version > old.version then
    v_payload := pg_catalog.jsonb_build_object(
      'scenarioId', new.scenario_id, 'direction', new.direction, 'entryPrice', new.entry_price,
      'stopPrice', new.stop_price, 'targetPrice', new.target_price, 'virtualEquity', new.virtual_equity,
      'virtualEquityAfter', case when new.status = 'closed' then new.virtual_equity + coalesce(new.pnl, 0) else null end,
      'riskPercent', new.risk_percent, 'riskBudget', new.risk_budget, 'units', new.units,
      'currentIndex', new.current_index, 'status', new.status, 'exitPrice', new.exit_price,
      'exitReason', new.exit_reason, 'pnl', new.pnl, 'version', new.version
    );
    insert into public.paper_trade_ledger_events
      (user_id, session_id, session_version, event_type, candle_index, payload)
    values (new.user_id, new.id, new.version, 'candle_revealed', new.current_index, v_payload)
    on conflict (session_id, session_version, event_type) do nothing;

    if old.status <> 'closed' and new.status = 'closed' then
      insert into public.paper_trade_ledger_events
        (user_id, session_id, session_version, event_type, candle_index, payload)
      values (new.user_id, new.id, new.version, 'session_closed', new.current_index, v_payload)
      on conflict (session_id, session_version, event_type) do nothing;
    end if;
  end if;
  return new;
end; $$;

revoke all on function public.record_paper_trade_ledger_event() from public, anon, authenticated;
drop trigger if exists paper_trade_ledger_events_on_session_change on public.paper_trade_sessions;
create trigger paper_trade_ledger_events_on_session_change
  after insert or update on public.paper_trade_sessions
  for each row execute function public.record_paper_trade_ledger_event();

-- Backfill a start snapshot and the latest available state for sessions created before this migration.
insert into public.paper_trade_ledger_events
  (user_id, session_id, session_version, event_type, candle_index, payload, created_at)
select s.user_id, s.id, 0, 'session_started', 0,
  pg_catalog.jsonb_build_object(
    'scenarioId', s.scenario_id, 'direction', s.direction, 'entryPrice', s.entry_price,
    'stopPrice', s.stop_price, 'targetPrice', s.target_price, 'virtualEquity', s.virtual_equity, 'virtualEquityAfter', null,
    'riskPercent', s.risk_percent, 'riskBudget', s.risk_budget, 'units', s.units,
    'currentIndex', 0, 'status', 'open', 'exitPrice', null, 'exitReason', null, 'pnl', null, 'version', 0
  ), s.created_at
from public.paper_trade_sessions s
on conflict (session_id, session_version, event_type) do nothing;

insert into public.paper_trade_ledger_events
  (user_id, session_id, session_version, event_type, candle_index, payload, created_at)
select s.user_id, s.id, s.version, 'candle_revealed', s.current_index,
  pg_catalog.jsonb_build_object(
    'scenarioId', s.scenario_id, 'direction', s.direction, 'entryPrice', s.entry_price,
    'stopPrice', s.stop_price, 'targetPrice', s.target_price, 'virtualEquity', s.virtual_equity, 'virtualEquityAfter', case when s.status = 'closed' then s.virtual_equity + coalesce(s.pnl, 0) else null end,
    'riskPercent', s.risk_percent, 'riskBudget', s.risk_budget, 'units', s.units,
    'currentIndex', s.current_index, 'status', s.status, 'exitPrice', s.exit_price,
    'exitReason', s.exit_reason, 'pnl', s.pnl, 'version', s.version
  ), s.updated_at
from public.paper_trade_sessions s
where s.version > 0
on conflict (session_id, session_version, event_type) do nothing;

insert into public.paper_trade_ledger_events
  (user_id, session_id, session_version, event_type, candle_index, payload, created_at)
select s.user_id, s.id, s.version, 'session_closed', s.current_index,
  pg_catalog.jsonb_build_object(
    'scenarioId', s.scenario_id, 'direction', s.direction, 'entryPrice', s.entry_price,
    'stopPrice', s.stop_price, 'targetPrice', s.target_price, 'virtualEquity', s.virtual_equity,
    'riskPercent', s.risk_percent, 'riskBudget', s.risk_budget, 'units', s.units,
    'currentIndex', s.current_index, 'status', s.status, 'exitPrice', s.exit_price,
    'exitReason', s.exit_reason, 'pnl', s.pnl, 'version', s.version
  ), coalesce(s.closed_at, s.updated_at)
from public.paper_trade_sessions s
where s.status = 'closed'
on conflict (session_id, session_version, event_type) do nothing;
