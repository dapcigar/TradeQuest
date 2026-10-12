-- Opt-in learner profiles for the future community challenge directory.
-- Private by default; only explicitly public profile fields are readable by other learners.
create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null check (handle ~ '^[a-z0-9][a-z0-9_-]{2,19}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  bio text not null default '' check (char_length(bio) <= 280),
  is_public boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create unique index if not exists community_profiles_handle_ci_unique
  on public.community_profiles (pg_catalog.lower(handle));

alter table public.community_profiles enable row level security;
revoke all on public.community_profiles from public, anon, authenticated;
-- Direct table reads expose only opted-in profile fields. Ownership IDs and writes
-- are handled by narrowly scoped SECURITY DEFINER functions bound to auth.uid().
grant select (handle, display_name, bio, is_public, updated_at)
  on public.community_profiles to authenticated;

drop policy if exists "Learners read own or public community profiles" on public.community_profiles;
create policy "Learners read public community profiles" on public.community_profiles
  for select to authenticated using (is_public = true);

create or replace function public.get_my_community_profile() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.community_profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into v_profile from public.community_profiles where user_id = v_user_id;
  if not found then return null; end if;
  return pg_catalog.jsonb_build_object(
    'handle', v_profile.handle,
    'displayName', v_profile.display_name,
    'bio', v_profile.bio,
    'isPublic', v_profile.is_public,
    'updatedAt', v_profile.updated_at
  );
end;
$$;

create or replace function public.save_my_community_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_is_public boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.community_profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_handle is null or p_handle !~ '^[a-z0-9][a-z0-9_-]{2,19}$'
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
  return pg_catalog.jsonb_build_object(
    'handle', v_profile.handle,
    'displayName', v_profile.display_name,
    'bio', v_profile.bio,
    'isPublic', v_profile.is_public,
    'updatedAt', v_profile.updated_at
  );
end;
$$;

create or replace function public.delete_my_community_profile() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  delete from public.community_profiles where user_id = v_user_id;
end;
$$;

revoke all on function public.get_my_community_profile() from public, anon;
revoke all on function public.save_my_community_profile(text, text, text, boolean) from public, anon;
revoke all on function public.delete_my_community_profile() from public, anon;
grant execute on function public.get_my_community_profile() to authenticated;
grant execute on function public.save_my_community_profile(text, text, text, boolean) to authenticated;
grant execute on function public.delete_my_community_profile() to authenticated;

create or replace function public.set_community_profile_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.set_community_profile_updated_at() from public, anon, authenticated;
drop trigger if exists community_profiles_updated_at on public.community_profiles;
create trigger community_profiles_updated_at
  before update on public.community_profiles
  for each row execute function public.set_community_profile_updated_at();
