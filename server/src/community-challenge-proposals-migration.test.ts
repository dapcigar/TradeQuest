import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013080000_community_challenge_proposals.sql'), 'utf8');

describe('learner-authored challenge proposal migration contract', () => {
  it('creates private unpublished drafts owned by the authenticated learner', () => {
    expect(migration).toMatch(/created_by uuid references auth\.users\(id\) on delete set null/i);
    expect(migration).toMatch(/published, source_reference, content_version, editorial_status, created_by/i);
    expect(migration).toMatch(/false, 'Learner-authored proposal submitted in TradeQuest', 1, 'draft', v_user_id/i);
    expect(migration).toMatch(/where q\.created_by = v_user_id/i);
  });

  it('requires an existing published synthetic scenario and a server-defined outcome', () => {
    expect(migration).toMatch(/from public\.chart_dojo_scenarios[\s\S]*?where scenario_id = p_scenario_id and published = true/i);
    expect(migration).toMatch(/jsonb_each\(v_scenario\.answer_key\)/i);
    expect(migration).toMatch(/option_entry\.result ->> 'outcome' = p_positive_outcome/i);
    expect(migration).not.toMatch(/p_score|p_pnl|p_rubric_met/i);
  });

  it('limits draft edits to the owning learner and increments content version', () => {
    expect(migration).toMatch(/where challenge_id = p_challenge_id and created_by = v_user_id and editorial_status = 'draft'/i);
    expect(migration).toMatch(/content_version = content_version \+ 1/i);
    expect(migration).toMatch(/Only draft proposals can be edited/i);
  });

  it('moves drafts into the admin editorial queue without publishing them', () => {
    expect(migration).toMatch(/set editorial_status = 'in-review'[\s\S]*?created_by = v_user_id[\s\S]*?editorial_status = 'draft' and published = false/i);
    expect(migration).toMatch(/where c\.editorial_status in \('draft', 'in-review', 'rejected', 'legacy-published'\)/i);
    expect(migration).toMatch(/grant execute on function public\.create_community_challenge_draft[\s\S]*?to authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.update_community_challenge_draft[\s\S]*?to authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.submit_community_challenge_draft[\s\S]*?to authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.list_my_community_challenge_proposals[\s\S]*?to authenticated/i);
  });
});
