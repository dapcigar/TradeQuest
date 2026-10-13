-- Read-only, moderator-only access to the immutable moderation audit history.
-- Return only moderation metadata needed for review; never expose moderator user IDs.
create or replace function public.list_community_moderation_history() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_community_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  return pg_catalog.jsonb_build_object(
    'actions', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'actionId', q.action_id,
        'entryId', q.entry_id_snapshot,
        'action', q.action,
        'previousStatus', q.previous_status,
        'newStatus', q.new_status,
        'reason', q.reason,
        'createdAt', q.created_at
      ) order by q.created_at desc)
      from (
        select action_id, entry_id_snapshot, action, previous_status, new_status, reason, created_at
        from public.community_moderation_actions
        order by created_at desc
        limit 100
      ) q
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_community_moderation_history() from public, anon;
grant execute on function public.list_community_moderation_history() to authenticated;
