import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261012280000_community_challenge_editorial_review.sql'), 'utf8');

describe('community challenge editorial review migration contract', () => {
  it('records provenance and preserves legacy content while drafting new challenges by default', () => {
    expect(migration).toMatch(/add column if not exists source_reference text not null/i);
    expect(migration).toMatch(/add column if not exists content_version integer not null default 1/i);
    expect(migration).toMatch(/add column if not exists editorial_status text not null default 'draft'/i);
    expect(migration).toMatch(/editorial_status = 'legacy-published'/i);
    expect(migration).toMatch(/src\/soloChallenges\.tsx? \(existing published solo challenge definition\)/i);
  });

  it('requires an admin role and a reason for every editorial publication decision', () => {
    expect(migration).toMatch(/create table if not exists public\.community_challenge_reviews/i);
    expect(migration).toMatch(/if not public\.is_community_admin\(\) then raise exception 'Editorial admin access required'/i);
    expect(migration).toMatch(/p_decision not in \('approve', 'revision-needed', 'retire'\)/i);
    expect(migration).toMatch(/char_length\(pg_catalog\.btrim\(p_reason\)\) not between 3 and 500/i);
    expect(migration).toMatch(/insert into public\.community_challenge_reviews/i);
    expect(migration).toMatch(/if p_decision <> 'approve' then[\s\S]*?update public\.community_challenge_entries set[\s\S]*?is_public = false/i);
    expect(migration).toMatch(/Challenge unpublished during editorial review/i);
    expect(migration).toMatch(/new_published, content_version, reason/i);
  });

  it('hides draft, rejected and retired content from learners and blocks submissions against it', () => {
    expect(migration).toMatch(/published = true and editorial_status in \('approved', 'legacy-published'\)/i);
    expect(migration).toMatch(/where challenge_id = p_challenge_id and published = true\s+and editorial_status in \('approved', 'legacy-published'\)/i);
    expect(migration).toMatch(/c\.editorial_status in \('approved', 'legacy-published'\)/i);
    expect(migration).toMatch(/grant execute on function public\.review_community_challenge\(text, text, text\) to authenticated/i);
    expect(migration).not.toMatch(/grant all on public\.community_challenge_reviews/i);
  });
});
