-- Shared per-account rate limits across serverless API instances.
-- These limits complement, but do not replace, provider-level IP/edge protection.
create table if not exists public.api_rate_limit_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in (
    'learning_write', 'paper_trade_start', 'paper_trade_step',
    'journal_write', 'weekly_plan_write', 'account_export', 'delete_learning_data'
  )),
  window_start timestamptz not null,
  hit_count integer not null check (hit_count > 0),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (user_id, bucket)
);

alter table public.api_rate_limit_windows enable row level security;
revoke all on public.api_rate_limit_windows from public, anon, authenticated;

create or replace function public.consume_user_rate_limit(p_bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_seconds integer;
  v_limit integer;
  v_window_start timestamptz;
  v_hits integer;
begin
  if v_user_id is null then
    raise exception 'Authenticated learner required' using errcode = '42501';
  end if;

  case p_bucket
    when 'learning_write' then v_window_seconds := 60; v_limit := 60;
    when 'paper_trade_start' then v_window_seconds := 60; v_limit := 20;
    when 'paper_trade_step' then v_window_seconds := 60; v_limit := 120;
    when 'journal_write' then v_window_seconds := 60; v_limit := 30;
    when 'weekly_plan_write' then v_window_seconds := 60; v_limit := 30;
    when 'account_export' then v_window_seconds := 3600; v_limit := 3;
    when 'delete_learning_data' then v_window_seconds := 3600; v_limit := 2;
    else raise exception 'Unsupported rate-limit bucket' using errcode = '22023';
  end case;

  v_window_start := pg_catalog.to_timestamp(
    (pg_catalog.floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds)::double precision
  );

  insert into public.api_rate_limit_windows (user_id, bucket, window_start, hit_count, updated_at)
  values (v_user_id, p_bucket, v_window_start, 1, v_now)
  on conflict (user_id, bucket) do update
    set window_start = greatest(public.api_rate_limit_windows.window_start, excluded.window_start),
        hit_count = case
          when public.api_rate_limit_windows.window_start = excluded.window_start
            then public.api_rate_limit_windows.hit_count + 1
          when public.api_rate_limit_windows.window_start < excluded.window_start
            then 1
          else public.api_rate_limit_windows.hit_count + 1
        end,
        updated_at = excluded.updated_at
  returning hit_count into v_hits;

  return v_hits <= v_limit;
end; $$;

revoke all on function public.consume_user_rate_limit(text) from public, anon;
grant execute on function public.consume_user_rate_limit(text) to authenticated;
