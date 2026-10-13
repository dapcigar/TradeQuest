-- Do not expose or accept the challenge's positive outcome in learner proposal payloads.
-- The server derives it from an already published community challenge for the chosen scenario.
drop function if exists public.create_community_challenge_draft(text, text, text, text, text, integer);
drop function if exists public.update_community_challenge_draft(text, text, text, text, text, text, integer);

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

create function public.create_community_challenge_draft(
  p_scenario_id text,
  p_title text,
  p_description text,
  p_rubric text,
  p_estimated_minutes integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_scenario public.chart_dojo_scenarios%rowtype;
  v_positive_outcome text;
  v_next_id integer;
  v_challenge public.community_challenges%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_scenario_id is null or p_scenario_id !~ '^TQ-SYN-[0-9]{3}$'
     or p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) not between 3 and 100
     or p_description is null or pg_catalog.char_length(pg_catalog.btrim(p_description)) not between 10 and 500
     or p_rubric is null or pg_catalog.char_length(pg_catalog.btrim(p_rubric)) not between 10 and 1000
     or p_estimated_minutes is null or p_estimated_minutes not between 1 and 120 then
    raise exception 'Invalid challenge proposal' using errcode = '22023';
  end if;

  select * into v_scenario from public.chart_dojo_scenarios
  where scenario_id = p_scenario_id and published = true
  order by created_at desc limit 1;
  if not found then raise exception 'Published synthetic scenario not found' using errcode = 'P0002'; end if;

  select c.positive_outcome into v_positive_outcome
  from public.community_challenges c
  where c.scenario_id = p_scenario_id and c.published = true
    and c.editorial_status in ('approved', 'legacy-published')
  order by c.challenge_id asc limit 1;
  if not found then raise exception 'Published challenge template not found for this scenario' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from pg_catalog.jsonb_each(v_scenario.answer_key) as option_entry(choice_id, result)
    where option_entry.result ->> 'outcome' = v_positive_outcome
  ) then
    raise exception 'Published challenge rubric does not match the selected scenario' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(871320260);
  select coalesce(pg_catalog.max(pg_catalog.substring(challenge_id from 7)::integer), 0) + 1
    into v_next_id
  from public.community_challenges
  where challenge_id ~ '^QUEST-[0-9]{3}$';
  if v_next_id > 999 then raise exception 'Challenge catalogue ID capacity reached' using errcode = '22023'; end if;

  insert into public.community_challenges (
    challenge_id, scenario_id, title, description, rubric, positive_outcome,
    estimated_minutes, published, source_reference, content_version, editorial_status, created_by
  ) values (
    'QUEST-' || pg_catalog.lpad(v_next_id::text, 3, '0'),
    p_scenario_id, pg_catalog.btrim(p_title), pg_catalog.btrim(p_description),
    pg_catalog.btrim(p_rubric), v_positive_outcome, p_estimated_minutes,
    false, 'Learner-authored proposal submitted in TradeQuest', 1, 'draft', v_user_id
  ) returning * into v_challenge;

  return pg_catalog.jsonb_build_object(
    'challengeId', v_challenge.challenge_id, 'scenarioId', v_challenge.scenario_id,
    'title', v_challenge.title, 'description', v_challenge.description, 'rubric', v_challenge.rubric,
    'estimatedMinutes', v_challenge.estimated_minutes, 'contentVersion', v_challenge.content_version,
    'editorialStatus', v_challenge.editorial_status, 'published', v_challenge.published,
    'reviewReason', v_challenge.review_reason
  );
end;
$$;

create function public.update_community_challenge_draft(
  p_challenge_id text,
  p_scenario_id text,
  p_title text,
  p_description text,
  p_rubric text,
  p_estimated_minutes integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_scenario public.chart_dojo_scenarios%rowtype;
  v_positive_outcome text;
  v_challenge public.community_challenges%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_challenge_id is null or p_challenge_id !~ '^QUEST-[0-9]{3}$'
     or p_scenario_id is null or p_scenario_id !~ '^TQ-SYN-[0-9]{3}$'
     or p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) not between 3 and 100
     or p_description is null or pg_catalog.char_length(pg_catalog.btrim(p_description)) not between 10 and 500
     or p_rubric is null or pg_catalog.char_length(pg_catalog.btrim(p_rubric)) not between 10 and 1000
     or p_estimated_minutes is null or p_estimated_minutes not between 1 and 120 then
    raise exception 'Invalid challenge proposal' using errcode = '22023';
  end if;

  select * into v_scenario from public.chart_dojo_scenarios
  where scenario_id = p_scenario_id and published = true
  order by created_at desc limit 1;
  if not found then raise exception 'Published synthetic scenario not found' using errcode = 'P0002'; end if;

  select c.positive_outcome into v_positive_outcome
  from public.community_challenges c
  where c.scenario_id = p_scenario_id and c.published = true
    and c.editorial_status in ('approved', 'legacy-published')
  order by c.challenge_id asc limit 1;
  if not found then raise exception 'Published challenge template not found for this scenario' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from pg_catalog.jsonb_each(v_scenario.answer_key) as option_entry(choice_id, result)
    where option_entry.result ->> 'outcome' = v_positive_outcome
  ) then
    raise exception 'Published challenge rubric does not match the selected scenario' using errcode = '22023';
  end if;

  update public.community_challenges set
    scenario_id = p_scenario_id,
    title = pg_catalog.btrim(p_title),
    description = pg_catalog.btrim(p_description),
    rubric = pg_catalog.btrim(p_rubric),
    positive_outcome = v_positive_outcome,
    estimated_minutes = p_estimated_minutes,
    content_version = content_version + 1,
    source_reference = 'Learner-authored proposal edited in TradeQuest',
    reviewed_by = null,
    reviewed_at = null,
    review_reason = null
  where challenge_id = p_challenge_id and created_by = v_user_id and editorial_status = 'draft'
  returning * into v_challenge;

  if not found then
    if exists (select 1 from public.community_challenges where challenge_id = p_challenge_id and created_by = v_user_id) then
      raise exception 'Only draft proposals can be edited' using errcode = '22023';
    end if;
    raise exception 'Challenge proposal not found or not owned by learner' using errcode = '42501';
  end if;

  return pg_catalog.jsonb_build_object(
    'challengeId', v_challenge.challenge_id, 'scenarioId', v_challenge.scenario_id,
    'title', v_challenge.title, 'description', v_challenge.description, 'rubric', v_challenge.rubric,
    'estimatedMinutes', v_challenge.estimated_minutes, 'contentVersion', v_challenge.content_version,
    'editorialStatus', v_challenge.editorial_status, 'published', v_challenge.published,
    'reviewReason', v_challenge.review_reason
  );
end;
$$;

revoke all on function public.create_community_challenge_draft(text, text, text, text, integer) from public, anon;
revoke all on function public.update_community_challenge_draft(text, text, text, text, text, integer) from public, anon;
grant execute on function public.create_community_challenge_draft(text, text, text, text, integer) to authenticated;
grant execute on function public.update_community_challenge_draft(text, text, text, text, text, integer) to authenticated;
