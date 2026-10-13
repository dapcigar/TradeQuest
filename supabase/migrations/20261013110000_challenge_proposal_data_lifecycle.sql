-- Include learner-authored challenge proposals in export and deletion lifecycle.
-- Unreviewed drafts are deleted. Reviewed proposals are redacted/unpublished so the
-- editorial audit trail can remain intact without retaining the learner's authored content.
create or replace function public.delete_own_learning_data() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
  v_counts jsonb := '{}'::jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  delete from public.community_challenge_entries where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('communityChallengeEntries', v_deleted);

  delete from public.community_reports where reporter_user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('communityReports', v_deleted);

  delete from public.community_challenges c
  where c.created_by = v_user_id
    and not exists (
      select 1 from public.community_challenge_reviews r where r.challenge_id = c.challenge_id
    );
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('communityChallengeProposalsDeleted', v_deleted);

  update public.community_challenges c set
    title = 'Removed challenge proposal',
    description = 'Content removed at account deletion.',
    rubric = 'Content removed.',
    source_reference = 'Learner-authored proposal removed at account deletion',
    created_by = null,
    published = false,
    editorial_status = 'retired',
    reviewed_by = null,
    reviewed_at = null,
    review_reason = null,
    content_version = c.content_version + 1
  where c.created_by = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('communityChallengeProposalsRedacted', v_deleted);

  delete from public.community_profiles where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('communityProfiles', v_deleted);

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
