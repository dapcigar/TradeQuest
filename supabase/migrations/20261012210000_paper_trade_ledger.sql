-- Persistent private paper-trade sessions. Learners may read their own rows but cannot write outcomes directly.
create table if not exists public.paper_trade_sessions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scenario_id text not null default 'synthetic-paper-basics' check (scenario_id = 'synthetic-paper-basics'),
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric not null check (entry_price > 0 and entry_price <= 1000000000),
  stop_price numeric not null check (stop_price > 0 and stop_price <= 1000000000),
  target_price numeric not null check (target_price > 0 and target_price <= 1000000000),
  virtual_equity numeric not null check (virtual_equity > 0 and virtual_equity <= 1000000000),
  risk_percent numeric not null check (risk_percent between 0.01 and 5),
  risk_budget numeric not null check (risk_budget > 0),
  units numeric not null check (units > 0),
  current_index integer not null default 0 check (current_index between 0 and 11),
  status text not null default 'open' check (status in ('open', 'closed')),
  exit_price numeric,
  exit_reason text check (exit_reason is null or exit_reason in ('stop', 'target', 'ambiguous-stop-first', 'sequence-end')),
  pnl numeric,
  version integer not null default 0 check (version >= 0),
  last_response jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  closed_at timestamptz,
  constraint paper_trade_sessions_distinct_prices check (entry_price <> stop_price and entry_price <> target_price),
  constraint paper_trade_sessions_directional_prices check (
    (direction = 'long' and stop_price < entry_price and target_price > entry_price)
    or (direction = 'short' and stop_price > entry_price and target_price < entry_price)
  )
);

create table if not exists public.paper_trade_synthetic_candles (
  scenario_id text not null default 'synthetic-paper-basics' check (scenario_id = 'synthetic-paper-basics'),
  candle_index integer not null check (candle_index between 0 and 11),
  open_price numeric not null,
  high_price numeric not null,
  low_price numeric not null,
  close_price numeric not null,
  primary key (scenario_id, candle_index),
  check (high_price >= pg_catalog.greatest(open_price, close_price)),
  check (low_price <= pg_catalog.least(open_price, close_price))
);

insert into public.paper_trade_synthetic_candles (scenario_id,candle_index,open_price,high_price,low_price,close_price) values
 ('synthetic-paper-basics',0,100,104,98,103),('synthetic-paper-basics',1,103,106,101,102),
 ('synthetic-paper-basics',2,102,105,99,100),('synthetic-paper-basics',3,100,103,97,102),
 ('synthetic-paper-basics',4,102,108,101,107),('synthetic-paper-basics',5,107,109,103,104),
 ('synthetic-paper-basics',6,104,106,100,101),('synthetic-paper-basics',7,101,105,99,104),
 ('synthetic-paper-basics',8,104,110,103,109),('synthetic-paper-basics',9,109,112,106,107),
 ('synthetic-paper-basics',10,107,108,102,103),('synthetic-paper-basics',11,103,107,101,106)
on conflict (scenario_id,candle_index) do update set open_price=excluded.open_price,high_price=excluded.high_price,low_price=excluded.low_price,close_price=excluded.close_price;

alter table public.paper_trade_sessions enable row level security;
alter table public.paper_trade_synthetic_candles enable row level security;
revoke all on public.paper_trade_sessions from anon, authenticated;
grant select on public.paper_trade_sessions to authenticated;
revoke all on public.paper_trade_synthetic_candles from public, anon, authenticated;
drop policy if exists "Learners read own paper trade sessions" on public.paper_trade_sessions;
create policy "Learners read own paper trade sessions" on public.paper_trade_sessions
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.paper_trade_session_payload(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.paper_trade_sessions%rowtype;
  v_candle public.paper_trade_synthetic_candles%rowtype;
  v_candles jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_session from public.paper_trade_sessions where id = p_session_id and user_id = v_user_id;
  if not found then raise exception 'Paper trade session not found' using errcode = 'P0002'; end if;
  select * into v_candle from public.paper_trade_synthetic_candles where scenario_id = v_session.scenario_id and candle_index = v_session.current_index;
  select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'index', candle_index, 'open', open_price, 'high', high_price, 'low', low_price, 'close', close_price
  ) order by candle_index), '[]'::jsonb) into v_candles
  from public.paper_trade_synthetic_candles where scenario_id = v_session.scenario_id and candle_index <= v_session.current_index;
  return pg_catalog.jsonb_build_object(
    'sessionId',v_session.id,'version',v_session.version,'currentIndex',v_session.current_index,
    'scenarioId',v_session.scenario_id,'label','Synthetic paper trade · fictional units','totalCandles',12,
    'candle',pg_catalog.jsonb_build_object('index',v_candle.candle_index,'open',v_candle.open_price,'high',v_candle.high_price,'low',v_candle.low_price,'close',v_candle.close_price),
    'candles',v_candles,'complete',(v_session.status = 'closed'),
    'position',pg_catalog.jsonb_build_object('direction',v_session.direction,'entry',v_session.entry_price,'stop',v_session.stop_price,'target',v_session.target_price,'units',v_session.units,'riskBudget',v_session.risk_budget,'virtualEquity',v_session.virtual_equity),
    'outcome',case when v_session.status = 'closed' then pg_catalog.jsonb_build_object('exitPrice',v_session.exit_price,'reason',v_session.exit_reason,'pnl',v_session.pnl,'virtualEquityAfter',v_session.virtual_equity + v_session.pnl) else null end,
    'policy','If stop and target are both touched within one candle, stop is assumed first. Adverse gaps fill at the candle open. Costs, spread and ordinary slippage are otherwise excluded.'
  );
end; $$;

create or replace function public.get_paper_trade_session(p_session_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select public.paper_trade_session_payload(p_session_id);
$$;

create or replace function public.start_paper_trade_session(
  p_direction text, p_entry numeric, p_stop numeric, p_target numeric, p_virtual_equity numeric, p_risk_percent numeric
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid(); v_id uuid; v_risk_budget numeric; v_units numeric; v_response jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_direction not in ('long','short') or p_entry is null or p_stop is null or p_target is null or p_virtual_equity is null or p_risk_percent is null
     or p_entry::text in ('NaN','Infinity','-Infinity') or p_stop::text in ('NaN','Infinity','-Infinity') or p_target::text in ('NaN','Infinity','-Infinity')
     or p_virtual_equity::text in ('NaN','Infinity','-Infinity') or p_risk_percent::text in ('NaN','Infinity','-Infinity')
     or p_entry <= 0 or p_stop <= 0 or p_target <= 0 or p_entry > 1000000000 or p_stop > 1000000000 or p_target > 1000000000
     or p_virtual_equity <= 0 or p_virtual_equity > 1000000000 or p_risk_percent < 0.01 or p_risk_percent > 5 then
    raise exception 'Invalid paper trade plan' using errcode = '22023';
  end if;
  if p_entry = p_stop or p_entry = p_target or (p_direction='long' and not (p_stop < p_entry and p_target > p_entry)) or (p_direction='short' and not (p_stop > p_entry and p_target < p_entry)) then
    raise exception 'Invalid price direction for paper trade plan' using errcode = '22023';
  end if;
  v_risk_budget := p_virtual_equity * p_risk_percent / 100;
  v_units := v_risk_budget / pg_catalog.abs(p_entry - p_stop);
  if v_units <= 0 or v_units::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid position size' using errcode = '22023'; end if;
  insert into public.paper_trade_sessions(user_id,direction,entry_price,stop_price,target_price,virtual_equity,risk_percent,risk_budget,units)
  values (v_user_id,p_direction,p_entry,p_stop,p_target,p_virtual_equity,p_risk_percent,v_risk_budget,v_units) returning id into v_id;
  v_response := public.paper_trade_session_payload(v_id);
  update public.paper_trade_sessions set last_response=v_response where id=v_id and user_id=v_user_id;
  return v_response;
end; $$;

create or replace function public.advance_paper_trade_session(p_session_id uuid, p_expected_version integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid(); v_session public.paper_trade_sessions%rowtype; v_candle public.paper_trade_synthetic_candles%rowtype;
  v_next_index integer; v_hit_stop boolean; v_hit_target boolean; v_exit_price numeric; v_exit_reason text; v_pnl numeric;
  v_status text; v_response jsonb; v_direction_factor numeric;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_session from public.paper_trade_sessions where id=p_session_id and user_id=v_user_id for update;
  if not found then raise exception 'Paper trade session not found' using errcode = 'P0002'; end if;
  if p_expected_version = v_session.version - 1 and v_session.last_response is not null then return v_session.last_response; end if;
  if p_expected_version <> v_session.version then raise exception 'Stale paper trade version' using errcode = '40001'; end if;
  if v_session.status = 'closed' then raise exception 'Paper trade session is closed' using errcode = '22023'; end if;
  v_next_index := v_session.current_index + 1;
  select * into v_candle from public.paper_trade_synthetic_candles where scenario_id=v_session.scenario_id and candle_index=v_next_index;
  if not found then raise exception 'Synthetic candle unavailable' using errcode = '22023'; end if;
  v_hit_stop := case when v_session.direction='long' then v_candle.low_price <= v_session.stop_price else v_candle.high_price >= v_session.stop_price end;
  v_hit_target := case when v_session.direction='long' then v_candle.high_price >= v_session.target_price else v_candle.low_price <= v_session.target_price end;
  v_direction_factor := case when v_session.direction='long' then 1 else -1 end;
  v_exit_price := null; v_exit_reason := null; v_pnl := null; v_status := 'open';
  if v_hit_stop and v_hit_target then
    v_exit_price := case when v_session.direction='long' then pg_catalog.least(v_session.stop_price,v_candle.open_price) else pg_catalog.greatest(v_session.stop_price,v_candle.open_price) end;
    v_exit_reason := 'ambiguous-stop-first';
  elsif v_hit_stop then
    v_exit_price := case when v_session.direction='long' then pg_catalog.least(v_session.stop_price,v_candle.open_price) else pg_catalog.greatest(v_session.stop_price,v_candle.open_price) end;
    v_exit_reason := 'stop';
  elsif v_hit_target then
    v_exit_price := v_session.target_price; v_exit_reason := 'target';
  elsif v_next_index = 11 then
    v_exit_price := v_candle.close_price; v_exit_reason := 'sequence-end';
  end if;
  if v_exit_reason is not null then v_status := 'closed'; v_pnl := (v_exit_price - v_session.entry_price) * v_session.units * v_direction_factor; end if;
  update public.paper_trade_sessions set current_index=v_next_index,status=v_status,exit_price=v_exit_price,exit_reason=v_exit_reason,pnl=v_pnl,
    version=version+1,updated_at=pg_catalog.now(),closed_at=case when v_status='closed' then pg_catalog.now() else null end
  where id=p_session_id and user_id=v_user_id;
  v_response := public.paper_trade_session_payload(p_session_id);
  update public.paper_trade_sessions set last_response=v_response where id=p_session_id and user_id=v_user_id;
  return v_response;
end; $$;

revoke all on function public.paper_trade_session_payload(uuid) from public, anon, authenticated;
revoke all on function public.get_paper_trade_session(uuid) from public, anon;
revoke all on function public.start_paper_trade_session(text,numeric,numeric,numeric,numeric,numeric) from public, anon;
revoke all on function public.advance_paper_trade_session(uuid,integer) from public, anon;
grant execute on function public.get_paper_trade_session(uuid) to authenticated;
grant execute on function public.start_paper_trade_session(text,numeric,numeric,numeric,numeric,numeric) to authenticated;
grant execute on function public.advance_paper_trade_session(uuid,integer) to authenticated;
