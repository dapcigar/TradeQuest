-- Add the chart-dojo practice milestone without editing already-applied migrations.
-- Apply after 202610110002_m2_progress_events_and_xp_guard.sql.

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
  values (v_user_id, 0, '{}'::text[], now())
  on conflict (user_id) do nothing;

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
