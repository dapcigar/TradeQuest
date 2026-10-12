-- User-configurable execution assumptions for synthetic paper-trade sessions.
-- Defaults preserve the original fictional price-unit model; no broker/instrument preset is implied.
alter table public.paper_trade_sessions
  add column if not exists instrument_label text not null default 'Generic price-unit model'
    check (char_length(btrim(instrument_label)) between 2 and 40),
  add column if not exists tick_size numeric not null default 1 check (tick_size > 0 and tick_size <= 1000000),
  add column if not exists tick_value numeric not null default 1 check (tick_value > 0 and tick_value <= 1000000),
  add column if not exists contract_size numeric not null default 1 check (contract_size > 0 and contract_size <= 1000000),
  add column if not exists lot_step numeric not null default 0.01 check (lot_step > 0 and lot_step <= 1000000),
  add column if not exists spread_ticks numeric not null default 0 check (spread_ticks between 0 and 1000),
  add column if not exists commission_per_unit numeric not null default 0 check (commission_per_unit between 0 and 1000000),
  add column if not exists slippage_ticks numeric not null default 0 check (slippage_ticks between 0 and 1000),
  add column if not exists leverage numeric not null default 1 check (leverage between 1 and 1000),
  add column if not exists estimated_stop_loss numeric not null default 0 check (estimated_stop_loss >= 0),
  add column if not exists margin_required numeric not null default 0 check (margin_required >= 0),
  add column if not exists exit_fill_price numeric check (exit_fill_price is null or (exit_fill_price > 0 and exit_fill_price <= 1000000000));

update public.paper_trade_sessions
set estimated_stop_loss = units * (
      (pg_catalog.abs(entry_price - stop_price) / tick_size + spread_ticks + 2 * slippage_ticks) * tick_value
      + 2 * commission_per_unit
    ),
    margin_required = entry_price * contract_size * units / leverage,
    exit_fill_price = case when status = 'closed' then coalesce(exit_fill_price, exit_price) else exit_fill_price end;

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
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'index', candle_index, 'open', open_price, 'high', high_price, 'low', low_price, 'close', close_price
  ) order by candle_index), '[]'::jsonb) into v_candles
  from public.paper_trade_synthetic_candles where scenario_id = v_session.scenario_id and candle_index <= v_session.current_index;
  return pg_catalog.jsonb_build_object(
    'sessionId',v_session.id,'version',v_session.version,'currentIndex',v_session.current_index,
    'scenarioId',v_session.scenario_id,'label','Synthetic paper trade · fictional candles','totalCandles',12,
    'candle',pg_catalog.jsonb_build_object('index',v_candle.candle_index,'open',v_candle.open_price,'high',v_candle.high_price,'low',v_candle.low_price,'close',v_candle.close_price),
    'candles',v_candles,'complete',(v_session.status = 'closed'),
    'position',pg_catalog.jsonb_build_object(
      'direction',v_session.direction,'entry',v_session.entry_price,'stop',v_session.stop_price,'target',v_session.target_price,
      'units',v_session.units,'riskBudget',v_session.risk_budget,'riskPercent',v_session.risk_percent,'estimatedStopLoss',v_session.estimated_stop_loss,
      'marginRequired',v_session.margin_required,'virtualEquity',v_session.virtual_equity,
      'instrumentSpec',pg_catalog.jsonb_build_object(
        'label',v_session.instrument_label,'tickSize',v_session.tick_size,'tickValue',v_session.tick_value,
        'contractSize',v_session.contract_size,'lotStep',v_session.lot_step,'spreadTicks',v_session.spread_ticks,
        'commissionPerUnit',v_session.commission_per_unit,'slippageTicks',v_session.slippage_ticks,'leverage',v_session.leverage
      )
    ),
    'outcome',case when v_session.status = 'closed' then pg_catalog.jsonb_build_object(
      'exitPrice',coalesce(v_session.exit_fill_price,v_session.exit_price),
      'triggerPrice',v_session.exit_price,'reason',v_session.exit_reason,'pnl',v_session.pnl,
      'virtualEquityAfter',v_session.virtual_equity + v_session.pnl
    ) else null end,
    'policy','User-defined synthetic assumptions only. Spread is round-trip ticks; commission and slippage are per side. Planned stop-loss estimates exclude adverse gap-through. A gap exits at the candle open before execution costs. Same-candle stop/target ambiguity resolves stop-first; no live quotes or broker fills are used.'
  );
end; $$;

create or replace function public.start_paper_trade_session_with_specs(
  p_direction text,
  p_entry numeric,
  p_stop numeric,
  p_target numeric,
  p_virtual_equity numeric,
  p_risk_percent numeric,
  p_instrument_label text,
  p_tick_size numeric,
  p_tick_value numeric,
  p_contract_size numeric,
  p_lot_step numeric,
  p_spread_ticks numeric,
  p_commission_per_unit numeric,
  p_slippage_ticks numeric,
  p_leverage numeric
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_risk_budget numeric;
  v_loss_per_unit numeric;
  v_units numeric;
  v_margin_required numeric;
  v_estimated_stop_loss numeric;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_direction is null or p_direction not in ('long','short')
     or p_entry is null or p_stop is null or p_target is null or p_virtual_equity is null or p_risk_percent is null
     or p_instrument_label is null or pg_catalog.char_length(pg_catalog.btrim(p_instrument_label)) not between 2 and 40
     or p_tick_size is null or p_tick_value is null or p_contract_size is null or p_lot_step is null
     or p_spread_ticks is null or p_commission_per_unit is null or p_slippage_ticks is null or p_leverage is null
     or p_entry::text in ('NaN','Infinity','-Infinity') or p_stop::text in ('NaN','Infinity','-Infinity')
     or p_target::text in ('NaN','Infinity','-Infinity') or p_virtual_equity::text in ('NaN','Infinity','-Infinity')
     or p_risk_percent::text in ('NaN','Infinity','-Infinity') or p_tick_size::text in ('NaN','Infinity','-Infinity')
     or p_tick_value::text in ('NaN','Infinity','-Infinity') or p_contract_size::text in ('NaN','Infinity','-Infinity')
     or p_lot_step::text in ('NaN','Infinity','-Infinity') or p_spread_ticks::text in ('NaN','Infinity','-Infinity')
     or p_commission_per_unit::text in ('NaN','Infinity','-Infinity') or p_slippage_ticks::text in ('NaN','Infinity','-Infinity')
     or p_leverage::text in ('NaN','Infinity','-Infinity')
     or p_entry < 0.000001 or p_stop < 0.000001 or p_target < 0.000001
     or p_entry > 1000000000 or p_stop > 1000000000 or p_target > 1000000000
     or p_virtual_equity <= 0 or p_virtual_equity > 1000000000 or p_risk_percent < 0.01 or p_risk_percent > 5
     or p_tick_size <= 0 or p_tick_size > 1000000 or p_tick_value <= 0 or p_tick_value > 1000000
     or p_contract_size <= 0 or p_contract_size > 1000000 or p_lot_step <= 0 or p_lot_step > 1000000
     or p_spread_ticks < 0 or p_spread_ticks > 1000 or p_commission_per_unit < 0 or p_commission_per_unit > 1000000
     or p_slippage_ticks < 0 or p_slippage_ticks > 1000 or p_leverage < 1 or p_leverage > 1000 then
    raise exception 'Invalid paper trade plan or execution assumptions' using errcode = '22023';
  end if;
  if p_entry = p_stop or p_entry = p_target
     or (p_direction='long' and not (p_stop < p_entry and p_target > p_entry))
     or (p_direction='short' and not (p_stop > p_entry and p_target < p_entry)) then
    raise exception 'Invalid price direction for paper trade plan' using errcode = '22023';
  end if;
  if pg_catalog.least(p_entry, p_stop, p_target) <= (p_spread_ticks / 2 + p_slippage_ticks) * p_tick_size
     or pg_catalog.greatest(p_entry, p_stop, p_target) + (p_spread_ticks / 2 + p_slippage_ticks) * p_tick_size > 1000000000 then
    raise exception 'Execution assumptions imply an invalid fill price' using errcode = '22023';
  end if;

  v_risk_budget := p_virtual_equity * p_risk_percent / 100;
  v_loss_per_unit := ((pg_catalog.abs(p_entry - p_stop) / p_tick_size) + p_spread_ticks + 2 * p_slippage_ticks) * p_tick_value
    + 2 * p_commission_per_unit;
  if v_loss_per_unit <= 0 or v_loss_per_unit::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Invalid estimated loss per unit' using errcode = '22023';
  end if;
  v_units := pg_catalog.floor((v_risk_budget / v_loss_per_unit) / p_lot_step) * p_lot_step;
  if v_units > 0 then
    v_units := pg_catalog.least(v_units, pg_catalog.floor((p_virtual_equity * p_leverage / (p_entry * p_contract_size)) / p_lot_step) * p_lot_step);
  end if;
  if v_units <= 0 or v_units > 1000000000000000000 or v_units::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Position size is below the configured lot step or margin limit' using errcode = '22023';
  end if;
  v_margin_required := p_entry * p_contract_size * v_units / p_leverage;
  v_estimated_stop_loss := v_units * v_loss_per_unit;
  if v_margin_required > p_virtual_equity or v_estimated_stop_loss > v_risk_budget then
    raise exception 'Position sizing exceeds the configured equity or risk budget' using errcode = '22023';
  end if;

  insert into public.paper_trade_sessions(
    user_id,direction,entry_price,stop_price,target_price,virtual_equity,risk_percent,risk_budget,units,
    instrument_label,tick_size,tick_value,contract_size,lot_step,spread_ticks,commission_per_unit,slippage_ticks,leverage,
    estimated_stop_loss,margin_required
  ) values (
    v_user_id,p_direction,p_entry,p_stop,p_target,p_virtual_equity,p_risk_percent,v_risk_budget,v_units,
    pg_catalog.btrim(p_instrument_label),p_tick_size,p_tick_value,p_contract_size,p_lot_step,p_spread_ticks,
    p_commission_per_unit,p_slippage_ticks,p_leverage,v_estimated_stop_loss,v_margin_required
  ) returning id into v_id;
  v_response := public.paper_trade_session_payload(v_id);
  update public.paper_trade_sessions set last_response=v_response where id=v_id and user_id=v_user_id;
  return v_response;
end; $$;

create or replace function public.start_paper_trade_session(
  p_direction text, p_entry numeric, p_stop numeric, p_target numeric, p_virtual_equity numeric, p_risk_percent numeric
) returns jsonb language sql security definer set search_path = '' as $$
  select public.start_paper_trade_session_with_specs(
    p_direction,p_entry,p_stop,p_target,p_virtual_equity,p_risk_percent,
    'Generic price-unit model',1,1,1,0.01,0,0,0,1
  );
$$;

create or replace function public.advance_paper_trade_session(p_session_id uuid, p_expected_version integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.paper_trade_sessions%rowtype;
  v_candle public.paper_trade_synthetic_candles%rowtype;
  v_next_index integer;
  v_hit_stop boolean;
  v_hit_target boolean;
  v_exit_price numeric;
  v_exit_fill_price numeric;
  v_entry_fill_price numeric;
  v_exit_reason text;
  v_pnl numeric;
  v_status text;
  v_response jsonb;
  v_direction_factor numeric;
  v_execution_cost_ticks numeric;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_expected_version is null or p_expected_version < 0 then raise exception 'Invalid paper trade version' using errcode = '22023'; end if;
  select * into v_session from public.paper_trade_sessions where id=p_session_id and user_id=v_user_id for update;
  if not found then raise exception 'Paper trade session not found' using errcode = 'P0002'; end if;
  if p_expected_version = v_session.version - 1 and v_session.last_response is not null then
    if v_session.last_response #>> '{position,instrumentSpec}' is null then
      v_response := public.paper_trade_session_payload(p_session_id);
      update public.paper_trade_sessions set last_response = v_response where id = p_session_id and user_id = v_user_id;
      return v_response;
    end if;
    return v_session.last_response;
  end if;
  if p_expected_version <> v_session.version then raise exception 'Stale paper trade version' using errcode = '40001'; end if;
  if v_session.status = 'closed' then raise exception 'Paper trade session is closed' using errcode = '22023'; end if;
  v_next_index := v_session.current_index + 1;
  select * into v_candle from public.paper_trade_synthetic_candles where scenario_id=v_session.scenario_id and candle_index=v_next_index;
  if not found then raise exception 'Synthetic candle unavailable' using errcode = '22023'; end if;
  v_hit_stop := case when v_session.direction='long' then v_candle.low_price <= v_session.stop_price else v_candle.high_price >= v_session.stop_price end;
  v_hit_target := case when v_session.direction='long' then v_candle.high_price >= v_session.target_price else v_candle.low_price <= v_session.target_price end;
  v_direction_factor := case when v_session.direction='long' then 1 else -1 end;
  v_exit_price := null; v_exit_fill_price := null; v_entry_fill_price := null; v_exit_reason := null; v_pnl := null; v_status := 'open';
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
  if v_exit_reason is not null then
    v_status := 'closed';
    v_execution_cost_ticks := v_session.spread_ticks / 2 + v_session.slippage_ticks;
    v_entry_fill_price := v_session.entry_price + v_direction_factor * v_execution_cost_ticks * v_session.tick_size;
    v_exit_fill_price := v_exit_price - v_direction_factor * v_execution_cost_ticks * v_session.tick_size;
    v_pnl := ((v_exit_fill_price - v_entry_fill_price) / v_session.tick_size) * v_session.tick_value * v_session.units * v_direction_factor
      - 2 * v_session.commission_per_unit * v_session.units;
  end if;
  update public.paper_trade_sessions set current_index=v_next_index,status=v_status,exit_price=v_exit_price,exit_fill_price=v_exit_fill_price,
    exit_reason=v_exit_reason,pnl=v_pnl,version=version+1,updated_at=pg_catalog.now(),
    closed_at=case when v_status='closed' then pg_catalog.now() else null end
  where id=p_session_id and user_id=v_user_id;
  v_response := public.paper_trade_session_payload(p_session_id);
  update public.paper_trade_sessions set last_response=v_response where id=p_session_id and user_id=v_user_id;
  return v_response;
end; $$;

create or replace function public.record_paper_trade_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_direction_factor numeric;
  v_execution_cost_ticks numeric;
  v_entry_fill_price numeric;
begin
  if tg_op = 'INSERT' then
    v_direction_factor := case when new.direction = 'long' then 1 else -1 end;
    v_execution_cost_ticks := new.spread_ticks / 2 + new.slippage_ticks;
    v_entry_fill_price := new.entry_price + v_direction_factor * v_execution_cost_ticks * new.tick_size;
    insert into public.paper_trade_fills
      (user_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at)
    values (
      new.user_id, new.id, 1, 'entry',
      case when new.direction = 'long' then 'buy' else 'sell' end,
      v_entry_fill_price, new.units, null, null, new.created_at
    )
    on conflict (session_id, fill_type) do nothing;
  elsif tg_op = 'UPDATE' and old.status <> 'closed' and new.status = 'closed' then
    if new.exit_fill_price is null or new.pnl is null or new.exit_reason is null then
      raise exception 'Closed paper trade requires a reconciled exit fill' using errcode = '23514';
    end if;
    insert into public.paper_trade_fills
      (user_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at)
    values (
      new.user_id, new.id, 2, 'exit',
      case when new.direction = 'long' then 'sell' else 'buy' end,
      new.exit_fill_price, new.units, new.pnl, new.exit_reason, coalesce(new.closed_at, new.updated_at)
    )
    on conflict (session_id, fill_type) do nothing;
  end if;
  return new;
end; $$;

revoke all on function public.paper_trade_session_payload(uuid) from public, anon, authenticated;
revoke all on function public.start_paper_trade_session_with_specs(text,numeric,numeric,numeric,numeric,numeric,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public, anon;
revoke all on function public.start_paper_trade_session(text,numeric,numeric,numeric,numeric,numeric) from public, anon;
revoke all on function public.advance_paper_trade_session(uuid,integer) from public, anon;
revoke all on function public.record_paper_trade_fill() from public, anon, authenticated;
grant execute on function public.start_paper_trade_session_with_specs(text,numeric,numeric,numeric,numeric,numeric,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
grant execute on function public.start_paper_trade_session(text,numeric,numeric,numeric,numeric,numeric) to authenticated;
grant execute on function public.advance_paper_trade_session(uuid,integer) to authenticated;

drop trigger if exists paper_trade_fills_on_session_change on public.paper_trade_sessions;
create trigger paper_trade_fills_on_session_change
  after insert or update on public.paper_trade_sessions
  for each row execute function public.record_paper_trade_fill();
