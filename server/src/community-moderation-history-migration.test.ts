import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013060000_community_moderation_history.sql'), 'utf8');

describe('community moderation history migration contract', () => {
  it('limits history access to authenticated moderators and admins', () => {
    expect(migration).toMatch(/if v_user_id is null then[\s\S]*?Authentication required/i);
    expect(migration).toMatch(/if not public\.is_community_moderator\(\) then[\s\S]*?Moderator access required/i);
    expect(migration).toMatch(/revoke all on function public\.list_community_moderation_history\(\) from public, anon/i);
    expect(migration).toMatch(/grant execute on function public\.list_community_moderation_history\(\) to authenticated/i);
  });

  it('returns a bounded, newest-first, read-only audit view without moderator identifiers', () => {
    expect(migration).toMatch(/from public\.community_moderation_actions/i);
    expect(migration).toMatch(/order by created_at desc\s+limit 100/i);
    expect(migration).toMatch(/'entryId', q\.entry_id_snapshot/i);
    expect(migration).toMatch(/'previousStatus', q\.previous_status/i);
    expect(migration).toMatch(/'newStatus', q\.new_status/i);
    expect(migration).toMatch(/'reason', q\.reason/i);
    expect(migration).not.toMatch(/'moderatorUserId'|'moderator_user_id'/i);
    expect(migration).not.toMatch(/insert into|update public\.community_moderation_actions|delete from public\.community_moderation_actions/i);
  });
});
