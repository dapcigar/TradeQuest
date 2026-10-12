-- Append-only simulated entry/exit fills for the synthetic Paper Trade Lab.
-- These are educational fills at the simulator's documented prices, not broker execution records.
create table if not exists public.paper_trade_fills (
  fill_id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.paper_trade_sessions(id) on delete cascade,
  fill_sequence smallint not null check (fill_sequence in (1, 2)),
  fill_type text not null check (fill_type in ('entry', 'exit')),
  side text not null check (side in ('buy', 'sell')),
  fill_price numeric not null check (fill_price > 0 and fill_price <= 1000000000),
  units numeric not null check (units > 0 and units <= 1000000000000000000),
  realized_pnl numeric,
  fill_reason text check (fill_reason is null or fill_reason in ('stop', 'target', 'ambiguous-stop-first', 'sequence-end')),
  filled_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint paper_trade_fills_session_sequence_unique unique (session_id, fill_sequence),
  constraint paper_trade_fills_session_type_unique unique (session_id, fill_type),
  constraint paper_trade_fills_role_fields check (
    (fill_type = 'entry' and fill_sequence = 1 and realized_pnl is null and fill_reason is null)
    or
    (fill_type = 'exit' and fill_sequence = 2 and realized_pnl is not null and fill_reason is not null)
  )
);

create index if not exists paper_trade_fills_owner_session_idx
  on public.paper_trade_fills(user_id, session_id, fill_sequence);

alter table public.paper_trade_fills enable row level security;
revoke all on public.paper_trade_fills from public, anon, authenticated;
grant select on public.paper_trade_fills to authenticated;
drop policy if exists "Learners read own paper trade fills" on public.paper_trade_fills;
create policy "Learners read own paper trade fills" on public.paper_trade_fills
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.record_paper_trade_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.paper_trade_fills
      (user_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at)
    values (
      new.user_id, new.id, 1, 'entry',
      case when new.direction = 'long' then 'buy' else 'sell' end,
      new.entry_price, new.units, null, null, new.created_at
    )
    on conflict (session_id, fill_type) do nothing;
  elsif tg_op = 'UPDATE' and old.status <> 'closed' and new.status = 'closed' then
    if new.exit_price is null or new.pnl is null or new.exit_reason is null then
      raise exception 'Closed paper trade requires a reconciled exit fill' using errcode = '23514';
    end if;
    insert into public.paper_trade_fills
      (user_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at)
    values (
      new.user_id, new.id, 2, 'exit',
      case when new.direction = 'long' then 'sell' else 'buy' end,
      new.exit_price, new.units, new.pnl, new.exit_reason, coalesce(new.closed_at, new.updated_at)
    )
    on conflict (session_id, fill_type) do nothing;
  end if;
  return new;
end; $$;

revoke all on function public.record_paper_trade_fill() from public, anon, authenticated;
drop trigger if exists paper_trade_fills_on_session_change on public.paper_trade_sessions;
create trigger paper_trade_fills_on_session_change
  after insert or update on public.paper_trade_sessions
  for each row execute function public.record_paper_trade_fill();

-- Backfill existing sessions without changing their state or outcomes.
insert into public.paper_trade_fills
  (user_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at)
select s.user_id, s.id, 1, 'entry',
  case when s.direction = 'long' then 'buy' else 'sell' end,
  s.entry_price, s.units, null, null, s.created_at
from public.paper_trade_sessions s
on conflict (session_id, fill_type) do nothing;

insert into public.paper_trade_fills
  (user_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at)
select s.user_id, s.id, 2, 'exit',
  case when s.direction = 'long' then 'sell' else 'buy' end,
  s.exit_price, s.units, s.pnl, s.exit_reason, coalesce(s.closed_at, s.updated_at)
from public.paper_trade_sessions s
where s.status = 'closed'
  and s.exit_price is not null
  and s.pnl is not null
  and s.exit_reason is not null
on conflict (session_id, fill_type) do nothing;
