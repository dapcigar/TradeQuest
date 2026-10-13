import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013090000_hide_unsubmitted_challenge_drafts.sql'), 'utf8');

describe('unsubmitted challenge proposal queue migration contract', () => {
  it('keeps unsubmitted learner drafts out of the editorial queue', () => {
    expect(migration).toMatch(/where c\.editorial_status in \('draft', 'in-review', 'rejected', 'legacy-published'\)/i);
    expect(migration).toMatch(/and \(c\.created_by is null or c\.editorial_status <> 'draft'\)/i);
    expect(migration).toMatch(/if not public\.is_community_admin\(\) then[\s\S]*?Editorial admin access required/i);
  });

  it('keeps submitted proposals eligible for review and does not grant direct table access', () => {
    expect(migration).toMatch(/editorial_status <> 'draft'/i);
    expect(migration).not.toMatch(/grant\s+(?:select|insert|update|delete).*community_challenges/i);
    expect(migration).not.toMatch(/update public\.community_challenges/i);
  });
});
