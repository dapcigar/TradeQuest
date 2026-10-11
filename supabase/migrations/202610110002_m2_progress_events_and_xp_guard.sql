-- M2 follow-up: persist non-quiz milestones and prevent repeat quiz XP farming.
-- Apply after 202610110001_m2_learner_progress.sql in a development project first.

create table if not exists public.progress_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  event_key text not null,
  xp_awarded integer not null check (xp_awarded between 0 and 100),
  recorded_at timestamptz not null default now(),
  primary key (user_id, event_id),
  unique (user_id, event_key)
);

alter table public.progress_events enable row level security;
create policy "Read own progress events" on public.progress_events
  for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete on public.progress_events from anon, authenticated;
grant select on public.progress_events to authenticated;

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
  v_xp integer;
  v_existing public.progress_events%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- The client can select only named milestones; it cannot submit an XP value.
  v_xp := case p_event_key
    when 'foundations-lesson-01' then 40
    when 'risk-tool-used-v1' then 10
    else null
  end;
  if v_xp is null then
    raise exception 'Unknown progress event' using errcode = '22023';
  end if;

  insert into public.learner_progress(user_id, xp, lessons_completed, updated_at)
  values (v_user_id, 0, '{}'::text[], now())
  on conflict (user_id) do nothing;

  -- Serialize this learner's progress writes, including concurrent retries.
  perform 1 from public.learner_progress where user_id = v_user_id for update;

  select * into v_existing from public.progress_events
    where user_id = v_user_id and event_key = p_event_key;
  if found then
    return jsonb_build_object(
      'eventKey', v_existing.event_key,
      'xpAwarded', 0,
      'alreadyRecorded', true
    );
  end if;

  insert into public.progress_events(user_id, event_id, event_key, xp_awarded)
  values (v_user_id, p_event_id, p_event_key, v_xp);

  update public.learner_progress
  set xp = xp + v_xp,
      updated_at = now()
  where user_id = v_user_id;

  return jsonb_build_object(
    'eventKey', p_event_key,
    'xpAwarded', v_xp,
    'alreadyRecorded', false
  );
end;
$$;

revoke all on function public.record_progress_event(uuid, text) from public, anon;
grant execute on function public.record_progress_event(uuid, text) to authenticated;

-- Replace the lesson RPC so passing the same lesson again cannot award XP repeatedly.
-- Lock the learner row before determining whether the lesson reward has already been claimed.
create or replace function public.submit_lesson_attempt(
  p_lesson_id text,
  p_lesson_version text,
  p_attempt_id uuid,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson public.lessons%rowtype;
  v_existing public.lesson_attempts%rowtype;
  v_progress public.learner_progress%rowtype;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean := false;
  v_xp integer := 0;
  v_answer jsonb;
  v_correct_answer jsonb;
  v_first_completion boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) < 1 or jsonb_array_length(p_answers) > 50 then
    raise exception 'Invalid answers';
  end if;

  select * into v_lesson from public.lessons
    where id = p_lesson_id and version = p_lesson_version and published = true;
  if not found then raise exception 'Published lesson version not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(v_lesson.answer_key) <> 'array' or jsonb_array_length(v_lesson.answer_key) = 0 then
    raise exception 'Lesson is not assessable';
  end if;

  insert into public.learner_progress(user_id, xp, lessons_completed, updated_at)
  values (v_user_id, 0, '{}'::text[], now())
  on conflict (user_id) do nothing;
  select * into v_progress from public.learner_progress where user_id = v_user_id for update;

  -- Check idempotency after taking the per-learner lock so concurrent retries
  -- cannot race between the lookup and the insert.
  select * into v_existing from public.lesson_attempts
    where user_id = v_user_id and attempt_id = p_attempt_id;
  if found then
    if v_existing.lesson_id = p_lesson_id and v_existing.lesson_version = p_lesson_version and v_existing.answers = p_answers then
      return jsonb_build_object('attemptId', p_attempt_id, 'score', v_existing.score, 'passed', v_existing.passed, 'xpAwarded', v_existing.xp_awarded, 'idempotentReplay', true);
    end if;
    raise exception 'Attempt ID already used with different content' using errcode = '23505';
  end if;

  v_total := jsonb_array_length(v_lesson.answer_key);
  for v_correct_answer in select value from jsonb_array_elements(v_lesson.answer_key)
  loop
    select value into v_answer from jsonb_array_elements(p_answers)
      where value->>'questionId' = v_correct_answer->>'questionId' limit 1;
    if v_answer is not null and v_answer->>'answerId' = v_correct_answer->>'answerId' then v_score := v_score + 1; end if;
    v_answer := null;
  end loop;

  v_score := floor((v_score::numeric / v_total) * 100)::integer;
  v_passed := v_score >= 80;
  v_first_completion := v_passed and not (p_lesson_id = any(v_progress.lessons_completed));
  if v_first_completion then v_xp := v_lesson.xp_reward; end if;

  insert into public.lesson_attempts(user_id, attempt_id, lesson_id, lesson_version, answers, score, passed, xp_awarded)
  values (v_user_id, p_attempt_id, p_lesson_id, p_lesson_version, p_answers, v_score, v_passed, v_xp);

  update public.learner_progress
  set xp = xp + v_xp,
      lessons_completed = case
        when v_first_completion then array_append(lessons_completed, p_lesson_id)
        else lessons_completed
      end,
      updated_at = now()
  where user_id = v_user_id;

  return jsonb_build_object('attemptId', p_attempt_id, 'score', v_score, 'passed', v_passed, 'xpAwarded', v_xp, 'idempotentReplay', false, 'firstCompletion', v_first_completion);
end;
$$;

revoke all on function public.submit_lesson_attempt(text, text, uuid, jsonb) from public, anon;
grant execute on function public.submit_lesson_attempt(text, text, uuid, jsonb) to authenticated;
