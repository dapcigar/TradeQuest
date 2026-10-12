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
grant select (user_id, handle, display_name, bio, is_public, updated_at)
  on public.community_profiles to authenticated;
grant insert (user_id, handle, display_name, bio, is_public)
  on public.community_profiles to authenticated;
grant update (user_id, handle, display_name, bio, is_public)
  on public.community_profiles to authenticated;

drop policy if exists "Learners read own or public community profiles" on public.community_profiles;
create policy "Learners read own or public community profiles" on public.community_profiles
  for select to authenticated using (auth.uid() = user_id or is_public = true);
drop policy if exists "Learners create own community profile" on public.community_profiles;
create policy "Learners create own community profile" on public.community_profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Learners update own community profile" on public.community_profiles;
create policy "Learners update own community profile" on public.community_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
