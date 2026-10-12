-- Account-backed weekly practice plans and self-recorded session dates.
create table if not exists public.weekly_practice_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  target integer not null default 3 check (target in (3, 5, 7)),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, week_start)
);

create table if not exists public.weekly_practice_sessions (
  user_id uuid not null,
  week_start date not null,
  session_date date not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, week_start, session_date),
  foreign key (user_id, week_start)
    references public.weekly_practice_plans(user_id, week_start) on delete cascade,
  check (session_date >= week_start and session_date <= week_start + 6)
);

alter table public.weekly_practice_plans enable row level security;
alter table public.weekly_practice_sessions enable row level security;
revoke all on public.weekly_practice_plans from anon, authenticated;
revoke all on public.weekly_practice_sessions from anon, authenticated;
grant select on public.weekly_practice_plans to authenticated;
grant select on public.weekly_practice_sessions to authenticated;

drop policy if exists "Learners read own weekly practice plans" on public.weekly_practice_plans;
create policy "Learners read own weekly practice plans" on public.weekly_practice_plans
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Learners read own weekly practice sessions" on public.weekly_practice_sessions;
create policy "Learners read own weekly practice sessions" on public.weekly_practice_sessions
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.get_weekly_practice_plan(p_week_start date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_target integer := 3;
  v_dates jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception 'Week start must be a Monday' using errcode = '22023';
  end if;
  select target into v_target from public.weekly_practice_plans
    where user_id = v_user_id and week_start = p_week_start;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_char(session_date, 'YYYY-MM-DD') order by session_date), '[]'::jsonb)
    into v_dates from public.weekly_practice_sessions
    where user_id = v_user_id and week_start = p_week_start;
  return pg_catalog.jsonb_build_object(
    'week', pg_catalog.to_char(p_week_start, 'YYYY-MM-DD'),
    'target', v_target,
    'completedDates', coalesce(v_dates, '[]'::jsonb)
  );
end; $$;

create or replace function public.set_weekly_practice_target(p_week_start date, p_target integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 or p_target not in (3,5,7) then
    raise exception 'Invalid weekly practice plan' using errcode = '22023';
  end if;
  insert into public.weekly_practice_plans(user_id, week_start, target, updated_at)
    values (v_user_id, p_week_start, p_target, pg_catalog.now())
    on conflict (user_id, week_start) do update set target = excluded.target, updated_at = pg_catalog.now();
  return public.get_weekly_practice_plan(p_week_start);
end; $$;

create or replace function public.set_weekly_practice_session(
  p_week_start date, p_session_date date, p_completed boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 or p_session_date is null
     or p_session_date < p_week_start or p_session_date > p_week_start + 6 or p_completed is null then
    raise exception 'Invalid weekly practice session' using errcode = '22023';
  end if;
  insert into public.weekly_practice_plans(user_id, week_start, target)
    values (v_user_id, p_week_start, 3) on conflict (user_id, week_start) do nothing;
  if p_completed then
    insert into public.weekly_practice_sessions(user_id, week_start, session_date)
      values (v_user_id, p_week_start, p_session_date)
      on conflict (user_id, week_start, session_date) do nothing;
  else
    delete from public.weekly_practice_sessions
      where user_id = v_user_id and week_start = p_week_start and session_date = p_session_date;
  end if;
  return public.get_weekly_practice_plan(p_week_start);
end; $$;

revoke all on function public.get_weekly_practice_plan(date) from public, anon, authenticated;
revoke all on function public.set_weekly_practice_target(date,integer) from public, anon, authenticated;
revoke all on function public.set_weekly_practice_session(date,date,boolean) from public, anon, authenticated;
grant execute on function public.get_weekly_practice_plan(date) to authenticated;
grant execute on function public.set_weekly_practice_target(date,integer) to authenticated;
grant execute on function public.set_weekly_practice_session(date,date,boolean) to authenticated;
