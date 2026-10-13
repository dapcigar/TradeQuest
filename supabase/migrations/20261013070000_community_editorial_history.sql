-- Read-only, admin-only history for challenge publication decisions.
-- The history deliberately omits reviewer account identifiers.
create or replace function public.list_community_challenge_review_history() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_community_admin() then
    raise exception 'Editorial admin access required' using errcode = '42501';
  end if;

  return pg_catalog.jsonb_build_object(
    'reviews', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'reviewId', q.review_id,
        'challengeId', q.challenge_id,
        'decision', q.decision,
        'previousStatus', q.previous_status,
        'newStatus', q.new_status,
        'previousPublished', q.previous_published,
        'newPublished', q.new_published,
        'contentVersion', q.content_version,
        'reason', q.reason,
        'createdAt', q.created_at
      ) order by q.created_at desc)
      from (
        select review_id, challenge_id, decision, previous_status, new_status,
          previous_published, new_published, content_version, reason, created_at
        from public.community_challenge_reviews
        order by created_at desc
        limit 100
      ) q
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_community_challenge_review_history() from public, anon;
grant execute on function public.list_community_challenge_review_history() to authenticated;
