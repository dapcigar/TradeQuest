-- Versioned, database-backed Chart Dojo scenario catalogue.
-- Apply after 202610110005_repair_chart_dojo_attempt_history.sql.

create table if not exists public.chart_dojo_scenarios (
  scenario_id text not null,
  version text not null,
  title text not null,
  prompt text not null,
  chart_data jsonb not null default '{}'::jsonb,
  choices jsonb not null,
  answer_key jsonb not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (scenario_id, version),
  check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 6),
  check (jsonb_typeof(answer_key) = 'object')
);

create unique index if not exists chart_dojo_one_published_version_per_scenario
  on public.chart_dojo_scenarios (scenario_id) where published = true;

alter table public.chart_dojo_scenarios enable row level security;
drop policy if exists "Read published Chart Dojo scenarios" on public.chart_dojo_scenarios;
create policy "Read published Chart Dojo scenarios" on public.chart_dojo_scenarios
  for select to authenticated using (published = true);
revoke all on public.chart_dojo_scenarios from anon, authenticated;
grant select (scenario_id, version, title, prompt, chart_data, choices, published, created_at)
  on public.chart_dojo_scenarios to authenticated;

insert into public.chart_dojo_scenarios
  (scenario_id, version, title, prompt, chart_data, choices, answer_key, published)
values
  (
    'TQ-SYN-001', '1', 'Momentum without a plan',
    'The illustrative candles have been moving higher. You have no defined entry, stop, or reason that would invalidate the idea.',
    '{"kind":"illustrative-uptrend","disclosure":"Synthetic teaching data; not live prices","instrument":"XAU/USD","timeframe":"1H"}'::jsonb,
    '[{"id":"wait","label":"Wait for more evidence and define risk first"},{"id":"buy","label":"Buy now because the trend looks strong"},{"id":"skip","label":"Skip the trade; the setup is unclear"}]'::jsonb,
    '{"wait":{"outcome":"disciplined","feedback":"A disciplined choice. Waiting or declining an unclear setup protects your decision process. Define what would prove the idea wrong before considering an entry."},"buy":{"outcome":"undefined-risk","feedback":"Momentum is not a plan. Entering without an invalidation point leaves risk undefined. A strong-looking chart does not guarantee continuation."},"skip":{"outcome":"disciplined","feedback":"A disciplined choice. Waiting or declining an unclear setup protects your decision process. Define what would prove the idea wrong before considering an entry."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-002', '1', 'A stop that is too wide',
    'Two hypothetical plans have the same account size. One has a stop distance that makes the potential loss exceed the learner’s stated risk budget. Decide what to do before entering.',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; no real prices or execution","accountEquity":10000,"riskBudgetPercent":1,"plans":[{"id":"A","stopDistance":15,"estimatedLoss":150},{"id":"B","stopDistance":120,"estimatedLoss":1200}]}'::jsonb,
    '[{"id":"recalculate","label":"Recalculate size or wait until the risk fits the budget"},{"id":"accept","label":"Accept the larger loss because the setup looks strong"},{"id":"skip","label":"Skip the setup if risk cannot be made acceptable"}]'::jsonb,
    '{"recalculate":{"outcome":"risk-aware","feedback":"Good process: size the position from the risk budget and stop distance. If the position cannot be sized reliably, do not force the trade."},"accept":{"outcome":"risk-exceeded","feedback":"A strong-looking setup does not change the risk budget. A potential loss above the planned limit means the plan needs to be resized or rejected."},"skip":{"outcome":"risk-aware","feedback":"Skipping a setup is a valid decision when its risk cannot be made acceptable. No trade is preferable to pretending the risk is controlled."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-003', '1', 'Evidence before prediction',
    'A synthetic chart has made a sharp move, but the next candle has not closed and your original thesis has no defined invalidation level. Choose the most disciplined next step.',
    '{"kind":"uncertain-breakout","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"1H","context":"sharp move; candle not closed; no invalidation level"}'::jsonb,
    '[{"id":"wait","label":"Wait for the candle close and define invalidation"},{"id":"chase","label":"Enter immediately to avoid missing the move"},{"id":"skip","label":"Skip if a clear plan cannot be formed"}]'::jsonb,
    '{"wait":{"outcome":"evidence-led","feedback":"Waiting for defined evidence reduces impulsive decisions. A candle close still does not guarantee direction; define the condition that invalidates the idea."},"chase":{"outcome":"impulsive","feedback":"Fear of missing out is not evidence. Entering before the scenario is defined can leave both the thesis and risk uncontrolled."},"skip":{"outcome":"evidence-led","feedback":"Skipping an unclear setup is a sound process choice. The objective is disciplined decision-making, not constant participation."}}'::jsonb,
    true
  )
on conflict (scenario_id, version) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  chart_data = excluded.chart_data,
  choices = excluded.choices,
  answer_key = excluded.answer_key,
  published = excluded.published;

alter table public.chart_dojo_attempts
  add column if not exists scenario_version text not null default '1';

alter table public.chart_dojo_attempts
  drop constraint if exists chart_dojo_attempts_scenario_id_check;

alter table public.chart_dojo_attempts
  drop constraint if exists chart_dojo_attempts_scenario_version_fkey;

alter table public.chart_dojo_attempts
  add constraint chart_dojo_attempts_scenario_version_fkey
  foreign key (scenario_id, scenario_version)
  references public.chart_dojo_scenarios(scenario_id, version);

create or replace function public.submit_chart_dojo_attempt(
  p_attempt_id uuid,
  p_scenario_id text,
  p_choice_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_scenario public.chart_dojo_scenarios%rowtype;
  v_existing public.chart_dojo_attempts%rowtype;
  v_option jsonb;
  v_outcome text;
  v_feedback text;
  v_progress_event jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_scenario from public.chart_dojo_scenarios
    where scenario_id = p_scenario_id and published = true;
  if not found then
    raise exception 'Unknown or unpublished scenario' using errcode = '22023';
  end if;

  select value into v_option
    from jsonb_array_elements(v_scenario.choices)
    where value->>'id' = p_choice_id;
  if v_option is null then
    raise exception 'Unknown choice for scenario' using errcode = '22023';
  end if;

  insert into public.learner_progress(user_id, xp, lessons_completed, updated_at)
  values (v_user_id, 0, '{}'::text[], now())
  on conflict (user_id) do nothing;
  perform 1 from public.learner_progress where user_id = v_user_id for update;

  select * into v_existing from public.chart_dojo_attempts
    where user_id = v_user_id and attempt_id = p_attempt_id;
  if found then
    if v_existing.scenario_id = p_scenario_id and v_existing.choice_id = p_choice_id then
      return jsonb_build_object(
        'attemptId', p_attempt_id,
        'scenarioId', v_existing.scenario_id,
        'scenarioVersion', v_existing.scenario_version,
        'choiceId', v_existing.choice_id,
        'outcome', v_existing.outcome,
        'feedback', v_existing.feedback,
        'xpAwarded', 0,
        'idempotentReplay', true
      );
    end if;
    raise exception 'Attempt ID already used with different content' using errcode = '23505';
  end if;

  v_outcome := v_scenario.answer_key->p_choice_id->>'outcome';
  v_feedback := v_scenario.answer_key->p_choice_id->>'feedback';
  if v_outcome is null or v_feedback is null then
    raise exception 'Scenario answer key is incomplete' using errcode = '22023';
  end if;

  insert into public.chart_dojo_attempts(
    user_id, attempt_id, scenario_id, scenario_version, choice_id, outcome, feedback
  ) values (
    v_user_id, p_attempt_id, p_scenario_id, v_scenario.version, p_choice_id, v_outcome, v_feedback
  );

  -- The introductory milestone is deliberately one-time across all scenarios.
  v_progress_event := public.record_progress_event(gen_random_uuid(), 'chart-dojo-scenario-01');

  return jsonb_build_object(
    'attemptId', p_attempt_id,
    'scenarioId', p_scenario_id,
    'scenarioVersion', v_scenario.version,
    'choiceId', p_choice_id,
    'outcome', v_outcome,
    'feedback', v_feedback,
    'xpAwarded', coalesce((v_progress_event->>'xpAwarded')::integer, 0),
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.submit_chart_dojo_attempt(uuid, text, text) from public, anon;
grant execute on function public.submit_chart_dojo_attempt(uuid, text, text) to authenticated;
