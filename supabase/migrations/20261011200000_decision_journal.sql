-- Private decision journal for structured process review.
-- Each row is owned by the authenticated learner; no public journal surface exists.
create table if not exists public.decision_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  scenario_id text check (scenario_id is null or scenario_id ~ '^TQ-SYN-[0-9]{3}$'),
  decision text not null check (decision in ('considered', 'waited', 'passed', 'simulated')),
  thesis text not null default '' check (char_length(thesis) <= 2000),
  invalidation text not null default '' check (char_length(invalidation) <= 1000),
  risk_plan text not null default '' check (char_length(risk_plan) <= 1000),
  reflection text not null default '' check (char_length(reflection) <= 2000),
  lesson_learned text not null default '' check (char_length(lesson_learned) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists decision_journal_entries_user_created_idx
  on public.decision_journal_entries (user_id, created_at desc);
alter table public.decision_journal_entries enable row level security;
revoke all on public.decision_journal_entries from anon, authenticated;
grant select, insert, update, delete on public.decision_journal_entries to authenticated;
drop policy if exists "Learners read own decision journal" on public.decision_journal_entries;
create policy "Learners read own decision journal" on public.decision_journal_entries
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Learners create own decision journal" on public.decision_journal_entries;
create policy "Learners create own decision journal" on public.decision_journal_entries
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Learners update own decision journal" on public.decision_journal_entries;
create policy "Learners update own decision journal" on public.decision_journal_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Learners delete own decision journal" on public.decision_journal_entries;
create policy "Learners delete own decision journal" on public.decision_journal_entries
  for delete to authenticated using (auth.uid() = user_id);
