-- TradeQuest M2 foundation. Apply with Supabase CLI to a disposable/dev project first.
create extension if not exists pgcrypto;

create table if not exists public.lessons (
  id text not null,
  version text not null,
  title text not null,
  published boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  answer_key jsonb not null default '[]'::jsonb,
  xp_reward integer not null default 0 check (xp_reward between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (id, version)
);

create table if not exists public.lesson_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  lesson_id text not null,
  lesson_version text not null,
  answers jsonb not null,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  xp_awarded integer not null check (xp_awarded between 0 and 100),
  submitted_at timestamptz not null default now(),
  primary key (user_id, attempt_id),
  foreign key (lesson_id, lesson_version) references public.lessons(id, version)
);

create table if not exists public.learner_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  lessons_completed text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.lessons enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.learner_progress enable row level security;

-- Learners can only read published lesson content. Answer keys are stored
-- separately from client-facing lesson content in production. This table's
-- answer_key column is not exposed through a view or direct client grant.
create policy "Read published lessons" on public.lessons
  for select to authenticated using (published = true);

create policy "Read own attempts" on public.lesson_attempts
  for select to authenticated using (auth.uid() = user_id);

create policy "Read own progress" on public.learner_progress
  for select to authenticated using (auth.uid() = user_id);

-- Do not grant direct INSERT/UPDATE/DELETE on attempts or progress to clients.
-- XP and completion are updated only by the security-definer RPC below.
revoke insert, update, delete on public.lesson_attempts from anon, authenticated;
revoke insert, update, delete on public.learner_progress from anon, authenticated;
revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to authenticated;
grant select on public.lesson_attempts, public.learner_progress to authenticated;

create or replace function public.submit_lesson_attempt(
  p_lesson_id text,
  p_lesson_version text,
  p_attempt_id uuid,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson public.lessons%rowtype;
  v_existing public.lesson_attempts%rowtype;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean := false;
  v_xp integer := 0;
  v_answer jsonb;
  v_correct_answer jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) < 1 or jsonb_array_length(p_answers) > 50 then
    raise exception 'Invalid answers';
  end if;

  select * into v_lesson from public.lessons
    where id = p_lesson_id and version = p_lesson_version and published = true;
  if not found then
    raise exception 'Published lesson version not found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(v_lesson.answer_key) <> 'array' or jsonb_array_length(v_lesson.answer_key) = 0 then
    raise exception 'Lesson is not assessable';
  end if;

  select * into v_existing from public.lesson_attempts
    where user_id = v_user_id and attempt_id = p_attempt_id;
  if found then
    if v_existing.lesson_id = p_lesson_id
       and v_existing.lesson_version = p_lesson_version
       and v_existing.answers = p_answers then
      return jsonb_build_object('attemptId', p_attempt_id, 'score', v_existing.score, 'passed', v_existing.passed, 'xpAwarded', v_existing.xp_awarded, 'idempotentReplay', true);
    end if;
    raise exception 'Attempt ID already used with different content' using errcode = '23505';
  end if;

  v_total := jsonb_array_length(v_lesson.answer_key);
  for v_correct_answer in select value from jsonb_array_elements(v_lesson.answer_key)
  loop
    select value into v_answer
    from jsonb_array_elements(p_answers)
    where value->>'questionId' = v_correct_answer->>'questionId'
    limit 1;
    if v_answer is not null and v_answer->>'answerId' = v_correct_answer->>'answerId' then
      v_score := v_score + 1;
    end if;
    v_answer := null;
  end loop;
  v_score := floor((v_score::numeric / v_total) * 100)::integer;
  v_passed := v_score >= 80;
  if v_passed then v_xp := v_lesson.xp_reward; end if;

  insert into public.lesson_attempts(user_id, attempt_id, lesson_id, lesson_version, answers, score, passed, xp_awarded)
  values (v_user_id, p_attempt_id, p_lesson_id, p_lesson_version, p_answers, v_score, v_passed, v_xp);

  insert into public.learner_progress(user_id, xp, lessons_completed, updated_at)
  values (v_user_id, v_xp, case when v_passed then array[p_lesson_id] else '{}'::text[] end, now())
  on conflict (user_id) do update set
    xp = public.learner_progress.xp + excluded.xp,
    lessons_completed = case
      when v_passed and not (p_lesson_id = any(public.learner_progress.lessons_completed))
        then array_append(public.learner_progress.lessons_completed, p_lesson_id)
      else public.learner_progress.lessons_completed
    end,
    updated_at = now();

  return jsonb_build_object('attemptId', p_attempt_id, 'score', v_score, 'passed', v_passed, 'xpAwarded', v_xp, 'idempotentReplay', false);
end;
$$;

revoke all on function public.submit_lesson_attempt(text, text, uuid, jsonb) from public, anon;
grant execute on function public.submit_lesson_attempt(text, text, uuid, jsonb) to authenticated;

-- Lesson seeding and editorial publication are deliberately separate from this migration.
