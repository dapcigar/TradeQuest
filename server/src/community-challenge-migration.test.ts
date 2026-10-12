import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261012270000_community_challenge_lifecycle.sql'), 'utf8');

describe('community challenge lifecycle migration contract', () => {
  it('derives rubric results from saved server-scored attempts rather than client scores', () => {
    expect(migration).toMatch(/foreign key \(user_id, attempt_id\) references public\.chart_dojo_attempts\(user_id, attempt_id\)/i);
    expect(migration).toMatch(/v_attempt\.outcome = v_challenge\.positive_outcome/i);
    expect(migration).toMatch(/unique \(user_id, attempt_id\)/i);
    expect(migration).toMatch(/p_reflection text,\s+p_is_public boolean/i);
    expect(migration).not.toMatch(/p_(?:score|pnl|outcome|rubric_met)\s+/i);
    expect(migration).not.toMatch(/profit leaderboard|pnl score/i);
  });

  it('keeps public entries hidden until approval and requires a public profile', () => {
    expect(migration).toMatch(/is_public boolean not null default false/i);
    expect(migration).toMatch(/case when p_is_public then 'pending' else 'approved' end/i);
    expect(migration).toMatch(/where e\.is_public = true and e\.moderation_status = 'approved'/i);
    expect(migration).toMatch(/join public\.community_profiles p on p\.user_id = e\.user_id and p\.is_public = true/i);
    expect(migration).toMatch(/A public community profile is required before publishing an entry/i);
    expect(migration).toMatch(/Turning profile visibility off also withdraws previously public entries/i);
  });

  it('uses RPC-only access for entries, reports and moderation with an audit trail', () => {
    expect(migration).toMatch(/alter table public\.community_challenge_entries enable row level security/i);
    expect(migration).toMatch(/revoke all on public\.community_challenge_entries from public, anon, authenticated/i);
    expect(migration).toMatch(/alter table public\.community_reports enable row level security/i);
    expect(migration).toMatch(/alter table public\.community_moderation_actions enable row level security/i);
    expect(migration).toMatch(/if not public\.is_community_moderator\(\) then raise exception 'Moderator access required'/i);
    expect(migration).toMatch(/insert into public\.community_moderation_actions/i);
    expect(migration).toMatch(/unique \(entry_id, reporter_user_id\)/i);
    expect(migration).toMatch(/delete from public\.community_challenge_entries where user_id = v_user_id/i);
    expect(migration).toMatch(/delete from public\.community_reports where reporter_user_id = v_user_id/i);
  });
});
