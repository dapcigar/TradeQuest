import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013110000_challenge_proposal_data_lifecycle.sql'), 'utf8');
const api = readFileSync(join(process.cwd(), 'server/src/index.ts'), 'utf8');

describe('challenge proposal account data lifecycle', () => {
  it('deletes unreviewed proposals and redacts reviewed proposals while preserving review history', () => {
    expect(migration).toMatch(/delete from public\.community_challenges c[\s\S]*?c\.created_by = v_user_id[\s\S]*?not exists \([\s\S]*?public\.community_challenge_reviews/i);
    expect(migration).toMatch(/update public\.community_challenges c set[\s\S]*?title = 'Removed challenge proposal'[\s\S]*?created_by = null[\s\S]*?published = false[\s\S]*?editorial_status = 'retired'/i);
    expect(migration).toMatch(/communityChallengeProposalsDeleted/i);
    expect(migration).toMatch(/communityChallengeProposalsRedacted/i);
    expect(migration).not.toMatch(/delete from public\.community_challenge_reviews/i);
  });

  it('keeps deletion authenticated and includes proposals in account export', () => {
    expect(migration).toMatch(/revoke all on function public\.delete_own_learning_data\(\) from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.delete_own_learning_data\(\) to authenticated/i);
    expect(api).toMatch(/db\.rpc\('list_my_community_challenge_proposals'\)/);
    expect(api).toMatch(/communityChallengeProposals:/);
    expect(api).toMatch(/Community challenge proposals/);
  });
});
