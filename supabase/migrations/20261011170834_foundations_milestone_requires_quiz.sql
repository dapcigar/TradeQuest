-- The 40 XP 'foundations-lesson-01' milestone was self-asserted by the client.
-- Require a passed quiz attempt (spread-basics recorded in lessons_completed by
-- submit_lesson_attempt) before it can be claimed. Apply to a disposable project first.

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
  -- Earned only after passing the lesson quiz. Idempotent replays still return
  -- alreadyRecorded because a passed quiz stays recorded.
  if p_event_key = 'foundations-lesson-01' and not exists (
    select 1 from public.learner_progress
    where user_id = v_user_id and 'spread-basics' = any(lessons_completed)
  ) then
    raise exception 'Quiz must be passed first' using errcode = '55000';
  end if;
  return public.award_progress_event(v_user_id, p_event_id, p_event_key);
end;
$$;

revoke all on function public.record_progress_event(uuid, text) from public, anon;
grant execute on function public.record_progress_event(uuid, text) to authenticated;
