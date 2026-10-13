-- Keep learner-authored drafts out of the admin review queue until the author submits them.
-- Source-controlled drafts remain visible to admins because they have no created_by owner.
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
      and (c.created_by is null or c.editorial_status <> 'draft')
  ), '[]'::jsonb);
end;
$$;
