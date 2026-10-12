import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261012260000_community_profiles.sql'), 'utf8');
const tableDefinition = migration.slice(migration.indexOf('create table'), migration.indexOf(');') + 2);

describe('community profile migration contract', () => {
  it('defaults profiles to private and limits public identity fields', () => {
    expect(migration).toMatch(/is_public boolean not null default false/i);
    expect(migration).toMatch(/handle text not null check \(handle ~ '\^\[a-z0-9\]/i);
    expect(migration).toMatch(/char_length\(btrim\(display_name\)\) between 2 and 40/i);
    expect(migration).toMatch(/char_length\(bio\) <= 280/i);
    expect(migration).toMatch(/create unique index if not exists community_profiles_handle_ci_unique\s+on public\.community_profiles \(pg_catalog\.lower\(handle\)\)/i);
    expect(tableDefinition).not.toMatch(/\\b(email|access_token|balance|journal|xp)\\b/i);
  });

  it('uses owner-scoped RLS for private reads and all writes', () => {
    expect(migration).toMatch(/alter table public\.community_profiles enable row level security/i);
    expect(migration).toMatch(/for select to authenticated using \(is_public = true\)/i);
    expect(migration).toMatch(/grant select \(handle, display_name, bio, is_public, updated_at\)\s+on public\.community_profiles to authenticated/i);
    expect(migration).toMatch(/create or replace function public\.get_my_community_profile\(\) returns jsonb/i);
    expect(migration).toMatch(/create or replace function public\.save_my_community_profile\(/i);
    expect(migration).toMatch(/create or replace function public\.delete_my_community_profile\(\) returns void/i);
    expect(migration).toMatch(/grant execute on function public\.get_my_community_profile\(\) to authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.save_my_community_profile\(text, text, text, boolean\) to authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.delete_my_community_profile\(\) to authenticated/i);
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete|all)\s+on\s+public\.community_profiles\s+to\s+authenticated/i);
    expect(migration).not.toMatch(/grant select \([^)]*user_id[^)]*\)\s+on public\.community_profiles/i);
  });
});
