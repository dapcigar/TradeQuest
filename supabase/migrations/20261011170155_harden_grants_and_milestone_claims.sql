-- Hardening found during the security/integrity audit. Apply to a disposable/dev project first.
--
-- 1. Default Supabase grants left TRUNCATE/REFERENCES/TRIGGER on learner tables for
--    anon/authenticated, and SELECT for anon. RLS already blocked row access, but client
--    roles should hold only the privileges they need (SELECT on own rows, authenticated only).
-- 2. record_progress_event was directly callable via /rest/v1/rpc and accepted the
--    'chart-dojo-scenario-01' key, so a learner could claim that 15 XP milestone without
--    ever submitting a Chart Dojo attempt. Move the award logic into an internal function
--    that client roles cannot execute; the public RPC refuses the dojo key.

revoke all on public.chart_dojo_attempts, public.learner_progress,
  public.lesson_attempts, public.progress_events from anon;
revoke truncate, references, trigger on public.chart_dojo_attempts, public.learner_progress,
  public.lesson_attempts, public.progress_events from authenticated;

create or replace function public.award_progress_event(
  p_user_id uuid,
  p_event_id uuid,
  p_event_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp integer;
  v_existing public.progress_events%rowtype;
begin
  v_xp := case p_event_key
    when 'foundations-lesson-01' then 40
    when 'risk-tool-used-v1' then 10
    when 'chart-dojo-scenario-01' then 15
    else null
  end;
  if v_xp is null then
    raise exception 'Unknown progress event' using errcode = '22023';
  end if;

  insert into public.learner_progress(user_id, xp, lessons_completed, updated_at)
  values (p_user_id, 0, '{}'::text[], now())
  on conflict (user_id) do nothing;

  -- Serialise this learner's progress writes, including concurrent retries.
  perform 1 from public.learner_progress where user_id = p_user_id for update;

  select * into v_existing from public.progress_events
    where user_id = p_user_id and event_key = p_event_key;
  if found then
    return jsonb_build_object('eventKey', v_existing.event_key, 'xpAwarded', 0, 'alreadyRecorded', true);
  end if;

  insert into public.progress_events(user_id, event_id, event_key, xp_awarded)
  values (p_user_id, p_event_id, p_event_key, v_xp);

  update public.learner_progress
  set xp = xp + v_xp, updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('eventKey', p_event_key, 'xpAwarded', v_xp, 'alreadyRecorded', false);
end;
$$;

revoke all on function public.award_progress_event(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.record_progress_event(
  p_event_id uuid,
  p_event_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Earned only by submitting a Chart Dojo attempt (see submit_chart_dojo_attempt).
  if p_event_key = 'chart-dojo-scenario-01' then
    raise exception 'Unknown progress event' using errcode = '22023';
  end if;
  return public.award_progress_event(v_user_id, p_event_id, p_event_key);
end;
$$;

revoke all on function public.record_progress_event(uuid, text) from public, anon;
grant execute on function public.record_progress_event(uuid, text) to authenticated;

-- Same body as migration 006, except the milestone now goes through the internal function.
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
  v_progress_event := public.award_progress_event(v_user_id, gen_random_uuid(), 'chart-dojo-scenario-01');

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
