-- Allow a signed-in learner to delete only their own server-stored learning records.
-- This intentionally does not delete the Supabase Auth identity or browser-local records.
create or replace function public.delete_own_learning_data() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
  v_counts jsonb := '{}'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.paper_trade_sessions where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('paperTradeSessions', v_deleted);

  delete from public.decision_journal_entries where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('decisionJournalEntries', v_deleted);

  delete from public.chart_dojo_attempts where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('chartDojoAttempts', v_deleted);

  delete from public.lesson_attempts where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('lessonAttempts', v_deleted);

  delete from public.progress_events where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('progressEvents', v_deleted);

  delete from public.learner_progress where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('learnerProgress', v_deleted);

  return pg_catalog.jsonb_build_object('deleted', v_counts);
end;
$$;

revoke all on function public.delete_own_learning_data() from public, anon, authenticated;
grant execute on function public.delete_own_learning_data() to authenticated;
