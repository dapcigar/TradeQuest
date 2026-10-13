import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013070000_community_editorial_history.sql'), 'utf8');

describe('community editorial history migration contract', () => {
  it('requires an authenticated community admin before returning review history', () => {
    expect(migration).toMatch(/if v_user_id is null then[\s\S]*?Authentication required/i);
    expect(migration).toMatch(/if not public\.is_community_admin\(\) then[\s\S]*?Editorial admin access required/i);
    expect(migration).toMatch(/revoke all on function public\.list_community_challenge_review_history\(\) from public, anon/i);
    expect(migration).toMatch(/grant execute on function public\.list_community_challenge_review_history\(\) to authenticated/i);
  });

  it('returns a bounded newest-first read-only audit view without reviewer identifiers', () => {
    expect(migration).toMatch(/from public\.community_challenge_reviews/i);
    expect(migration).toMatch(/order by created_at desc\s+limit 100/i);
    expect(migration).toMatch(/'decision', q\.decision/i);
    expect(migration).toMatch(/'previousPublished', q\.previous_published/i);
    expect(migration).toMatch(/'newPublished', q\.new_published/i);
    expect(migration).toMatch(/'contentVersion', q\.content_version/i);
    expect(migration).toMatch(/'reason', q\.reason/i);
    expect(migration).not.toMatch(/'reviewerUserId'|'reviewer_user_id'/i);
    expect(migration).not.toMatch(/insert into|update public\.community_challenge_reviews|delete from public\.community_challenge_reviews/i);
  });
});
