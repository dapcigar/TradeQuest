-- Source provenance and human editorial approval for the community challenge catalogue.
alter table public.community_challenges
  add column if not exists source_reference text not null default 'source-controlled migration',
  add column if not exists content_version integer not null default 1 check (content_version > 0),
  add column if not exists editorial_status text not null default 'draft'
    check (editorial_status in ('draft', 'in-review', 'approved', 'legacy-published', 'rejected', 'retired')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_reason text;

-- These two definitions already existed in the learner-facing solo-challenge module.
-- Preserve their current availability, but mark them as legacy content that needs a
-- human editorial review before they can be treated as newly approved catalogue content.
update public.community_challenges
set editorial_status = 'legacy-published',
    source_reference = 'src/soloChallenges.ts (existing published solo challenge definition)'
where published = true and editorial_status = 'draft';

drop policy if exists "Read published community challenges" on public.community_challenges;
create policy "Read published community challenges" on public.community_challenges
  for select to authenticated
  using (published = true and editorial_status in ('approved', 'legacy-published'));

create table if not exists public.community_challenge_reviews (
  review_id uuid primary key default pg_catalog.gen_random_uuid(),
  challenge_id text not null references public.community_challenges(challenge_id) on delete restrict,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('approve', 'revision-needed', 'retire')),
  previous_status text not null,
  new_status text not null,
  previous_published boolean not null,
  new_published boolean not null,
  content_version integer not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists community_challenge_reviews_history_idx
  on public.community_challenge_reviews(challenge_id, created_at desc);
alter table public.community_challenge_reviews enable row level security;
revoke all on public.community_challenge_reviews from public, anon, authenticated;

create or replace function public.is_community_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.community_moderators m
    where m.user_id = auth.uid() and m.role = 'admin'
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
    'estimatedMinutes', c.estimated_minutes,
    'contentVersion', c.content_version
  ) order by c.challenge_id), '[]'::jsonb)
  from public.community_challenges c
  where c.published = true and c.editorial_status in ('approved', 'legacy-published');
$$;

create or replace function public.list_community_editorial_queue() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_community_admin() then raise exception 'Editorial admin access required' using errcode = '42501'; end if;
  return coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'challengeId', c.challenge_id,
      'scenarioId', c.scenario_id,
      'title', c.title,
      'description', c.description,
      'rubric', c.rubric,
      'sourceReference', c.source_reference,
      'contentVersion', c.content_version,
      'editorialStatus', c.editorial_status,
      'published', c.published,
      'reviewedAt', c.reviewed_at,
      'reviewReason', c.review_reason
    ) order by c.created_at asc)
    from public.community_challenges c
    where c.editorial_status in ('draft', 'in-review', 'rejected', 'legacy-published')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.review_community_challenge(
  p_challenge_id text,
  p_decision text,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.community_challenges%rowtype;
  v_new_status text;
  v_new_published boolean;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_community_admin() then raise exception 'Editorial admin access required' using errcode = '42501'; end if;
  if p_challenge_id is null or p_decision is null or p_decision not in ('approve', 'revision-needed', 'retire')
     or p_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 3 and 500 then
    raise exception 'Invalid editorial decision' using errcode = '22023';
  end if;
  select * into v_challenge from public.community_challenges where challenge_id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found' using errcode = 'P0002'; end if;
  v_new_status := case p_decision when 'approve' then 'approved' when 'revision-needed' then 'draft' else 'retired' end;
  v_new_published := p_decision = 'approve';
  update public.community_challenges set
    editorial_status = v_new_status,
    published = v_new_published,
    reviewed_by = v_user_id,
    reviewed_at = pg_catalog.now(),
    review_reason = pg_catalog.btrim(p_reason)
  where challenge_id = p_challenge_id;
  if p_decision <> 'approve' then
    update public.community_challenge_entries set
      is_public = false,
      moderation_status = case when moderation_status = 'pending' then 'approved' else moderation_status end
    where challenge_id = p_challenge_id and is_public = true;
    update public.community_reports set
      status = 'resolved',
      resolved_by = v_user_id,
      resolved_at = pg_catalog.now(),
      resolution_reason = 'Challenge unpublished during editorial review: ' || pg_catalog.btrim(p_reason)
    where status = 'open' and entry_id in (
      select entry_id from public.community_challenge_entries where challenge_id = p_challenge_id
    );
  end if;
  insert into public.community_challenge_reviews(
    challenge_id, reviewer_user_id, decision, previous_status, new_status,
    previous_published, new_published, content_version, reason
  ) values (
    p_challenge_id, v_user_id, p_decision, v_challenge.editorial_status, v_new_status,
    v_challenge.published, v_new_published, v_challenge.content_version, pg_catalog.btrim(p_reason)
  );
  return pg_catalog.jsonb_build_object(
    'challengeId', p_challenge_id, 'decision', p_decision,
    'editorialStatus', v_new_status, 'published', v_new_published,
    'contentVersion', v_challenge.content_version
  );
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
    where challenge_id = p_challenge_id and published = true
      and editorial_status in ('approved', 'legacy-published');
  if not found then raise exception 'Challenge not found or not approved for use' using errcode = 'P0002'; end if;
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
        and c.editorial_status in ('approved', 'legacy-published')
      join public.community_profiles p on p.user_id = e.user_id and p.is_public = true
      where e.is_public = true and e.moderation_status = 'approved'
      order by e.created_at desc limit p_limit
    ) q
  ), '[]'::jsonb);
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
    join public.community_challenges c on c.challenge_id = e.challenge_id and c.published = true
      and c.editorial_status in ('approved', 'legacy-published')
    where e.entry_id = p_entry_id and e.user_id <> v_user_id
      and e.is_public = true and e.moderation_status = 'approved'
  ) then raise exception 'Public entry not found' using errcode = 'P0002'; end if;
  insert into public.community_reports(entry_id, reporter_user_id, category, details)
  values (p_entry_id, v_user_id, p_category, pg_catalog.btrim(p_details))
  returning * into v_report;
  return pg_catalog.jsonb_build_object('reportId', v_report.report_id, 'status', v_report.status, 'createdAt', v_report.created_at);
end;
$$;

revoke all on function public.is_community_admin() from public, anon;
revoke all on function public.list_community_editorial_queue() from public, anon;
revoke all on function public.review_community_challenge(text, text, text) from public, anon;
revoke all on function public.list_community_challenges() from public, anon;
revoke all on function public.submit_community_challenge_entry(text, uuid, text, boolean) from public, anon;
revoke all on function public.list_public_community_challenge_entries(integer) from public, anon;
revoke all on function public.report_community_challenge_entry(uuid, text, text) from public, anon;
grant execute on function public.is_community_admin() to authenticated;
grant execute on function public.list_community_editorial_queue() to authenticated;
grant execute on function public.review_community_challenge(text, text, text) to authenticated;
grant execute on function public.list_community_challenges() to authenticated;
grant execute on function public.submit_community_challenge_entry(text, uuid, text, boolean) to authenticated;
grant execute on function public.list_public_community_challenge_entries(integer) to authenticated;
grant execute on function public.report_community_challenge_entry(uuid, text, text) to authenticated;
