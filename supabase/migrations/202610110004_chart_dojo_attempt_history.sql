-- Persist the learner's actual choice and server-authored feedback for Chart Dojo.
-- Apply after 202610110003_chart_dojo_progress_event.sql in development first.

create table if not exists public.chart_dojo_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  scenario_id text not null check (scenario_id = 'TQ-SYN-001'),
  choice_id text not null check (choice_id in ('wait', 'buy', 'skip')),
  outcome text not null check (outcome in ('disciplined', 'undefined-risk')),
  feedback text not null,
  submitted_at timestamptz not null default now(),
  primary key (user_id, attempt_id)
);

alter table public.chart_dojo_attempts enable row level security;
create policy "Read own chart dojo attempts" on public.chart_dojo_attempts
  for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.chart_dojo_attempts from anon, authenticated;
grant select on public.chart_dojo_attempts to authenticated;

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
  v_existing public.chart_dojo_attempts%rowtype;
  v_outcome text;
  v_feedback text;
  v_progress_event jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_scenario_id <> 'TQ-SYN-001' or p_choice_id not in ('wait', 'buy', 'skip') then
    raise exception 'Unknown scenario or choice' using errcode = '22023';
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
        'choiceId', v_existing.choice_id,
        'outcome', v_existing.outcome,
        'feedback', v_existing.feedback,
        'xpAwarded', 0,
        'idempotentReplay', true
      );
    end if;
    raise exception 'Attempt ID already used with different content' using errcode = '23505';
  end if;

  if p_choice_id in ('wait', 'skip') then
    v_outcome := 'disciplined';
    v_feedback := 'A disciplined choice. Waiting or declining an unclear setup protects your decision process. Define what would prove the idea wrong before considering an entry.';
  else
    v_outcome := 'undefined-risk';
    v_feedback := 'Momentum is not a plan. Entering without an invalidation point leaves risk undefined. A strong-looking chart does not guarantee continuation.';
  end if;

  insert into public.chart_dojo_attempts(user_id, attempt_id, scenario_id, choice_id, outcome, feedback)
  values (v_user_id, p_attempt_id, p_scenario_id, p_choice_id, v_outcome, v_feedback);

  -- Award the milestone at most once per learner, irrespective of replay attempts.
  v_progress_event := public.record_progress_event(gen_random_uuid(), 'chart-dojo-scenario-01');

  return jsonb_build_object(
    'attemptId', p_attempt_id,
    'scenarioId', p_scenario_id,
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
