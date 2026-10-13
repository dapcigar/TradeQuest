import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013100000_server_own_proposal_outcome.sql'), 'utf8');

describe('server-owned challenge proposal outcome migration contract', () => {
  it('removes the outcome from public challenge payloads', () => {
    expect(migration).toMatch(/create or replace function public\.list_community_challenges\(\)/i);
    expect(migration).not.toMatch(/'positiveOutcome', c\.positive_outcome/i);
  });

  it('derives the proposal outcome from a published server-owned challenge template', () => {
    expect(migration).toMatch(/select c\.positive_outcome into v_positive_outcome/i);
    expect(migration).toMatch(/c\.scenario_id = p_scenario_id and c\.published = true/i);
    expect(migration).toMatch(/jsonb_each\(v_scenario\.answer_key\)/i);
    expect(migration).not.toMatch(/p_positive_outcome/i);
    expect(migration).toMatch(/false, 'Learner-authored proposal submitted in TradeQuest', 1, 'draft', v_user_id/i);
  });

  it('replaces the old RPC signatures and grants only the new authenticated signatures', () => {
    expect(migration).toMatch(/drop function if exists public\.create_community_challenge_draft\(text, text, text, text, text, integer\)/i);
    expect(migration).toMatch(/drop function if exists public\.update_community_challenge_draft\(text, text, text, text, text, text, integer\)/i);
    expect(migration).toMatch(/grant execute on function public\.create_community_challenge_draft\(text, text, text, text, integer\) to authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.update_community_challenge_draft\(text, text, text, text, text, integer\) to authenticated/i);
  });
});
