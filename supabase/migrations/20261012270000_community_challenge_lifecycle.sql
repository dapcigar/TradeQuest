-- Curated, process-scored community challenges with explicit publication and moderation.
create table if not exists public.community_challenges (
  challenge_id text primary key check (challenge_id ~ '^QUEST-[0-9]{3}$'),
  scenario_id text not null,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  description text not null check (char_length(btrim(description)) between 10 and 500),
  rubric text not null check (char_length(btrim(rubric)) between 10 and 1000),
  positive_outcome text not null check (positive_outcome ~ '^[a-z][a-z0-9-]{1,39}$'),
  estimated_minutes smallint not null check (estimated_minutes between 1 and 120),
  published boolean not null default false,
  created_at timestamptz not null default pg_catalog.now()
);

insert into public.community_challenges
  (challenge_id, scenario_id, title, description, rubric, positive_outcome, estimated_minutes, published)
values
  ('QUEST-001', 'TQ-SYN-003', 'The patient explorer',
   'Review a fictional chart. Identify what evidence is missing before considering a decision.',
   'Wait for defined evidence; do not treat urgency or a possible move as confirmation.',
   'evidence-led', 10, true),
  ('QUEST-002', 'TQ-SYN-002', 'Risk budget detective',
   'Compare hypothetical plans and choose the one that respects a stated loss limit.',
   'Keep the planned loss within the stated budget; resize or pass when it does not fit.',
   'risk-aware', 8, true)
on conflict (challenge_id) do nothing;

alter table public.community_challenges enable row level security;
revoke all on public.community_challenges from public, anon, authenticated;
grant select (challenge_id, scenario_id, title, description, rubric, estimated_minutes, published, created_at)
  on public.community_challenges to authenticated;
drop policy if exists "Read published community challenges" on public.community_challenges;
create policy "Read published community challenges" on public.community_challenges
  for select to authenticated using (published = true);

create table if not exists public.community_challenge_entries (
  entry_id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null references public.community_challenges(challenge_id),
  attempt_id uuid not null,
  scenario_id text not null,
  outcome text not null check (outcome ~ '^[a-z][a-z0-9-]{1,39}$'),
  rubric_met boolean not null,
  reflection text not null check (char_length(btrim(reflection)) between 10 and 1000),
  is_public boolean not null default false,
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'hidden', 'removed')),
  created_at timestamptz not null default pg_catalog.now(),
  unique (user_id, attempt_id),
  foreign key (user_id, attempt_id) references public.chart_dojo_attempts(user_id, attempt_id) on delete cascade
);
create index if not exists community_challenge_entries_public_idx
  on public.community_challenge_entries(created_at desc)
  where is_public = true and moderation_status = 'approved';
create index if not exists community_challenge_entries_owner_idx
  on public.community_challenge_entries(user_id, created_at desc);
alter table public.community_challenge_entries enable row level security;
revoke all on public.community_challenge_entries from public, anon, authenticated;

create table if not exists public.community_reports (
  report_id uuid primary key default pg_catalog.gen_random_uuid(),
  entry_id uuid not null references public.community_challenge_entries(entry_id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('spam', 'harassment', 'personal-information', 'unsafe-advice', 'copyright', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default pg_catalog.now(),
  unique (entry_id, reporter_user_id)
);
create index if not exists community_reports_open_idx on public.community_reports(created_at desc) where status = 'open';
alter table public.community_reports enable row level security;
revoke all on public.community_reports from public, anon, authenticated;

create table if not exists public.community_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  granted_at timestamptz not null default pg_catalog.now()
);
alter table public.community_moderators enable row level security;
revoke all on public.community_moderators from public, anon, authenticated;

create table if not exists public.community_moderation_actions (
  action_id uuid primary key default pg_catalog.gen_random_uuid(),
  entry_id uuid references public.community_challenge_entries(entry_id) on delete set null,
  entry_id_snapshot uuid not null,
  moderator_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('approve', 'hide', 'remove')),
  previous_status text,
  new_status text not null check (new_status in ('pending', 'approved', 'hidden', 'removed')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists community_moderation_actions_entry_idx on public.community_moderation_actions(entry_id_snapshot, created_at desc);
alter table public.community_moderation_actions enable row level security;
revoke all on public.community_moderation_actions from public, anon, authenticated;

create or replace function public.is_community_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.community_moderators m where m.user_id = auth.uid()
  );
$$;

create or replace function public.list_community_challenges() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'challengeId', c.challenge_id,
    'scenarioId', c.scenario_id,
    'title', c.title,
    'description', c.description,
    'rubric', c.rubric,
    'estimatedMinutes', c.estimated_minutes
  ) order by c.challenge_id), '[]'::jsonb)
  from public.community_challenges c where c.published = true;
$$;

create or replace function public.list_my_community_challenge_entries() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'entryId', e.entry_id, 'challengeId', e.challenge_id, 'scenarioId', e.scenario_id,
      'outcome', e.outcome, 'rubricMet', e.rubric_met, 'reflection', e.reflection,
      'isPublic', e.is_public, 'moderationStatus', e.moderation_status, 'createdAt', e.created_at
    ) order by e.created_at desc)
    from public.community_challenge_entries e where e.user_id = v_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_public_community_challenge_entries(p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 50 then raise exception 'Invalid page size' using errcode = '22023'; end if;
  return coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'entryId', q.entry_id, 'challengeId', q.challenge_id, 'title', q.title,
      'handle', q.handle, 'displayName', q.display_name, 'reflection', q.reflection,
      'rubricMet', q.rubric_met, 'createdAt', q.created_at
    ) order by q.created_at desc)
    from (
      select e.entry_id, e.challenge_id, c.title, p.handle, p.display_name,
        e.reflection, e.rubric_met, e.created_at
      from public.community_challenge_entries e
      join public.community_challenges c on c.challenge_id = e.challenge_id and c.published = true
      join public.community_profiles p on p.user_id = e.user_id and p.is_public = true
      where e.is_public = true and e.moderation_status = 'approved'
      order by e.created_at desc limit p_limit
    ) q
  ), '[]'::jsonb);
end;
$$;

create or replace function public.submit_community_challenge_entry(
  p_challenge_id text,
  p_attempt_id uuid,
  p_reflection text,
  p_is_public boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.community_challenges%rowtype;
  v_attempt public.chart_dojo_attempts%rowtype;
  v_existing public.community_challenge_entries%rowtype;
  v_entry public.community_challenge_entries%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_challenge_id is null or p_attempt_id is null or p_reflection is null
     or pg_catalog.char_length(pg_catalog.btrim(p_reflection)) not between 10 and 1000
     or p_is_public is null then
    raise exception 'Invalid community challenge entry' using errcode = '22023';
  end if;
  select * into v_challenge from public.community_challenges
    where challenge_id = p_challenge_id and published = true;
  if not found then raise exception 'Challenge not found' using errcode = 'P0002'; end if;
  select * into v_attempt from public.chart_dojo_attempts
    where user_id = v_user_id and attempt_id = p_attempt_id and scenario_id = v_challenge.scenario_id;
  if not found then raise exception 'A saved attempt for this challenge is required' using errcode = 'P0002'; end if;
  if p_is_public and not exists (
    select 1 from public.community_profiles where user_id = v_user_id and is_public = true
  ) then
    raise exception 'A public community profile is required before publishing an entry' using errcode = '22023';
  end if;
  select * into v_existing from public.community_challenge_entries
    where user_id = v_user_id and attempt_id = p_attempt_id;
  if found then
    if v_existing.challenge_id = p_challenge_id and v_existing.reflection = pg_catalog.btrim(p_reflection)
       and v_existing.is_public = p_is_public then
      return pg_catalog.jsonb_build_object(
        'entryId', v_existing.entry_id, 'challengeId', v_existing.challenge_id,
        'scenarioId', v_existing.scenario_id, 'outcome', v_existing.outcome,
        'rubricMet', v_existing.rubric_met, 'reflection', v_existing.reflection,
        'isPublic', v_existing.is_public, 'moderationStatus', v_existing.moderation_status,
        'createdAt', v_existing.created_at, 'idempotentReplay', true
      );
    end if;
    raise exception 'Attempt already submitted with different entry content' using errcode = '23505';
  end if;
  insert into public.community_challenge_entries(
    user_id, challenge_id, attempt_id, scenario_id, outcome, rubric_met, reflection, is_public, moderation_status
  ) values (
    v_user_id, p_challenge_id, p_attempt_id, v_challenge.scenario_id, v_attempt.outcome,
    v_attempt.outcome = v_challenge.positive_outcome, pg_catalog.btrim(p_reflection),
    p_is_public, case when p_is_public then 'pending' else 'approved' end
  ) returning * into v_entry;
  return pg_catalog.jsonb_build_object(
    'entryId', v_entry.entry_id, 'challengeId', v_entry.challenge_id,
    'scenarioId', v_entry.scenario_id, 'outcome', v_entry.outcome,
    'rubricMet', v_entry.rubric_met, 'reflection', v_entry.reflection,
    'isPublic', v_entry.is_public, 'moderationStatus', v_entry.moderation_status,
    'createdAt', v_entry.created_at, 'idempotentReplay', false
  );
end;
$$;

create or replace function public.list_my_community_reports() returns jsonb
language plpgsql stable security definer set search_path = '' as $
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'reportId', r.report_id, 'entryId', r.entry_id, 'category', r.category,
      'details', r.details, 'status', r.status, 'createdAt', r.created_at
    ) order by r.created_at desc)
    from public.community_reports r where r.reporter_user_id = v_user_id
  ), '[]'::jsonb);
end;
$;

create or replace function public.delete_my_community_challenge_entry(p_entry_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.community_challenge_entries where entry_id = p_entry_id and user_id = v_user_id;
end;
$$;

create or replace function public.report_community_challenge_entry(
  p_entry_id uuid,
  p_category text,
  p_details text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_report public.community_reports%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_entry_id is null or p_category is null or p_category not in ('spam', 'harassment', 'personal-information', 'unsafe-advice', 'copyright', 'other')
     or p_details is null or pg_catalog.char_length(pg_catalog.btrim(p_details)) > 1000 then
    raise exception 'Invalid community report' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.community_challenge_entries e
    join public.community_profiles p on p.user_id = e.user_id and p.is_public = true
    where e.entry_id = p_entry_id and e.user_id <> v_user_id
      and e.is_public = true and e.moderation_status = 'approved'
  ) then raise exception 'Public entry not found' using errcode = 'P0002'; end if;
  insert into public.community_reports(entry_id, reporter_user_id, category, details)
  values (p_entry_id, v_user_id, p_category, pg_catalog.btrim(p_details))
  returning * into v_report;
  return pg_catalog.jsonb_build_object('reportId', v_report.report_id, 'status', v_report.status, 'createdAt', v_report.created_at);
end;
$$;

create or replace function public.list_community_moderation_queue() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_community_moderator() then raise exception 'Moderator access required' using errcode = '42501'; end if;
  return pg_catalog.jsonb_build_object(
    'entries', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'entryId', q.entry_id, 'challengeId', q.challenge_id, 'title', q.title,
        'handle', q.handle, 'displayName', q.display_name, 'reflection', q.reflection,
        'rubricMet', q.rubric_met, 'createdAt', q.created_at
      ) order by q.created_at asc)
      from (
        select e.entry_id, e.challenge_id, c.title, p.handle, p.display_name,
          e.reflection, e.rubric_met, e.created_at
        from public.community_challenge_entries e
        join public.community_challenges c on c.challenge_id = e.challenge_id
        join public.community_profiles p on p.user_id = e.user_id
        where e.is_public = true and e.moderation_status = 'pending'
        order by e.created_at asc limit 100
      ) q
    ), '[]'::jsonb),
    'reports', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'reportId', q.report_id, 'entryId', q.entry_id, 'category', q.category,
        'details', q.details, 'createdAt', q.created_at, 'handle', coalesce(q.handle, '[profile withdrawn]'),
        'entryReflection', q.reflection
      ) order by q.created_at asc)
      from (
        select r.report_id, r.entry_id, r.category, r.details, r.created_at,
          p.handle, e.reflection
        from public.community_reports r
        join public.community_challenge_entries e on e.entry_id = r.entry_id
        left join public.community_profiles p on p.user_id = e.user_id
        where r.status = 'open'
        order by r.created_at asc limit 100
      ) q
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.moderate_community_challenge_entry(
  p_entry_id uuid,
  p_action text,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.community_challenge_entries%rowtype;
  v_previous text;
  v_new text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_community_moderator() then raise exception 'Moderator access required' using errcode = '42501'; end if;
  if p_entry_id is null or p_action is null or p_action not in ('approve', 'hide', 'remove')
     or p_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 3 and 500 then
    raise exception 'Invalid moderation action' using errcode = '22023';
  end if;
  select * into v_entry from public.community_challenge_entries where entry_id = p_entry_id for update;
  if not found then raise exception 'Entry not found' using errcode = 'P0002'; end if;
  v_previous := v_entry.moderation_status;
  v_new := case p_action when 'approve' then 'approved' when 'hide' then 'hidden' else 'removed' end;
  update public.community_challenge_entries set moderation_status = v_new where entry_id = p_entry_id;
  insert into public.community_moderation_actions(entry_id, entry_id_snapshot, moderator_user_id, action, previous_status, new_status, reason)
  values (p_entry_id, p_entry_id, v_user_id, p_action, v_previous, v_new, pg_catalog.btrim(p_reason));
  update public.community_reports set
    status = case when p_action = 'approve' then 'dismissed' else 'resolved' end,
    resolved_by = v_user_id, resolved_at = pg_catalog.now(), resolution_reason = pg_catalog.btrim(p_reason)
  where entry_id = p_entry_id and status = 'open';
  return pg_catalog.jsonb_build_object('entryId', p_entry_id, 'action', p_action, 'previousStatus', v_previous, 'status', v_new);
end;
$$;

create or replace function public.delete_my_community_profile() returns void
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.community_challenge_entries set is_public = false
    where user_id = v_user_id and is_public = true;
  delete from public.community_profiles where user_id = v_user_id;
end;
$$;

-- Turning profile visibility off also withdraws previously public entries so they
-- cannot silently reappear if the learner later re-enables the profile.
create or replace function public.save_my_community_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_is_public boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $
declare
  v_user_id uuid := auth.uid();
  v_profile public.community_profiles%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_handle is null or p_handle !~ '^[a-z0-9][a-z0-9_-]{2,19}
-- are deleted with the learner's other server-stored learning data.
create or replace function public.delete_own_learning_data() returns jsonb
language plpgsql security definer set search_path = '' as $
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
$;
revoke all on function public.delete_own_learning_data() from public, anon, authenticated;
grant execute on function public.delete_own_learning_data() to authenticated;

revoke all on function public.is_community_moderator() from public, anon;
revoke all on function public.list_community_challenges() from public, anon;
revoke all on function public.list_my_community_reports() from public, anon;
revoke all on function public.list_my_community_challenge_entries() from public, anon;
revoke all on function public.list_public_community_challenge_entries(integer) from public, anon;
revoke all on function public.submit_community_challenge_entry(text, uuid, text, boolean) from public, anon;
revoke all on function public.delete_my_community_challenge_entry(uuid) from public, anon;
revoke all on function public.report_community_challenge_entry(uuid, text, text) from public, anon;
revoke all on function public.list_community_moderation_queue() from public, anon;
revoke all on function public.moderate_community_challenge_entry(uuid, text, text) from public, anon;
grant execute on function public.is_community_moderator() to authenticated;
grant execute on function public.list_community_challenges() to authenticated;
grant execute on function public.list_my_community_reports() to authenticated;
grant execute on function public.list_my_community_challenge_entries() to authenticated;
grant execute on function public.list_public_community_challenge_entries(integer) to authenticated;
grant execute on function public.submit_community_challenge_entry(text, uuid, text, boolean) to authenticated;
grant execute on function public.delete_my_community_challenge_entry(uuid) to authenticated;
grant execute on function public.report_community_challenge_entry(uuid, text, text) to authenticated;
grant execute on function public.list_community_moderation_queue() to authenticated;
grant execute on function public.moderate_community_challenge_entry(uuid, text, text) to authenticated;

     or p_display_name is null or pg_catalog.char_length(pg_catalog.btrim(p_display_name)) not between 2 and 40
     or p_bio is null or pg_catalog.char_length(pg_catalog.btrim(p_bio)) > 280
     or p_is_public is null then
    raise exception 'Invalid community profile' using errcode = '22023';
  end if;
  insert into public.community_profiles(user_id, handle, display_name, bio, is_public)
  values (v_user_id, p_handle, pg_catalog.btrim(p_display_name), pg_catalog.btrim(p_bio), p_is_public)
  on conflict (user_id) do update set
    handle = excluded.handle,
    display_name = excluded.display_name,
    bio = excluded.bio,
    is_public = excluded.is_public
  returning * into v_profile;
  if not p_is_public then
    update public.community_challenge_entries set is_public = false
      where user_id = v_user_id and is_public = true;
  end if;
  return pg_catalog.jsonb_build_object(
    'handle', v_profile.handle,
    'displayName', v_profile.display_name,
    'bio', v_profile.bio,
    'isPublic', v_profile.is_public,
    'updatedAt', v_profile.updated_at
  );
end;
$;

-- Extend the account data deletion RPC so community contributions, reports and profile
-- are deleted with the learner's other server-stored learning data.
create or replace function public.delete_own_learning_data() returns jsonb
language plpgsql security definer set search_path = '' as $
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
$;
revoke all on function public.delete_own_learning_data() from public, anon, authenticated;
grant execute on function public.delete_own_learning_data() to authenticated;

revoke all on function public.is_community_moderator() from public, anon;
revoke all on function public.list_community_challenges() from public, anon;
revoke all on function public.list_my_community_reports() from public, anon;
revoke all on function public.list_my_community_challenge_entries() from public, anon;
revoke all on function public.list_public_community_challenge_entries(integer) from public, anon;
revoke all on function public.submit_community_challenge_entry(text, uuid, text, boolean) from public, anon;
revoke all on function public.delete_my_community_challenge_entry(uuid) from public, anon;
revoke all on function public.report_community_challenge_entry(uuid, text, text) from public, anon;
revoke all on function public.list_community_moderation_queue() from public, anon;
revoke all on function public.moderate_community_challenge_entry(uuid, text, text) from public, anon;
grant execute on function public.is_community_moderator() to authenticated;
grant execute on function public.list_community_challenges() to authenticated;
grant execute on function public.list_my_community_reports() to authenticated;
grant execute on function public.list_my_community_challenge_entries() to authenticated;
grant execute on function public.list_public_community_challenge_entries(integer) to authenticated;
grant execute on function public.submit_community_challenge_entry(text, uuid, text, boolean) to authenticated;
grant execute on function public.delete_my_community_challenge_entry(uuid) to authenticated;
grant execute on function public.report_community_challenge_entry(uuid, text, text) to authenticated;
grant execute on function public.list_community_moderation_queue() to authenticated;
grant execute on function public.moderate_community_challenge_entry(uuid, text, text) to authenticated;
