import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMastery } from './mastery.js';
import { attemptSchema, chartDojoAttemptSchema, progressEventSchema } from './schemas.js';

const read = (...parts: string[]) => readFileSync(resolve(__dirname, ...parts), 'utf8').replace(/\r\n/g, '\n');
// Comments are stripped so that a comment saying "never use X" does not trip a check for X.
const indexSource = read('index.ts').replace(/^\s*\/\/.*$/gm, '');
const migrationsDir = resolve(__dirname, '../../supabase/migrations');
const allMigrations = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  .map(file => read('../../supabase/migrations', file)).join('\n');

const LEARNER_TABLES = ['chart_dojo_attempts', 'lesson_attempts', 'progress_events', 'learner_progress', 'decision_journal_entries', 'paper_trade_sessions'];

// Route handlers, split on the app.get/app.post declarations.
const handlers = indexSource.split(/\n(?=app\.(?:get|post)\()/).filter(chunk => chunk.startsWith('app.'))
  .map(chunk => ({ route: chunk.match(/^app\.(?:get|post)\('([^']+)'/)![1], source: chunk }));

describe('API routes keep each learner\'s data separate', () => {
  it('finds the learner routes', () => {
    expect(handlers.map(h => h.route)).toEqual(expect.arrayContaining(['/v1/me/mastery', '/v1/chart-dojo/attempts', '/v1/me/progress', '/v1/me/export']));
  });

  it('requires a verified learner on every /v1 route', () => {
    for (const handler of handlers.filter(h => h.route.startsWith('/v1/'))) {
      expect(handler.source, handler.route).toContain('requireLearner');
    }
  });

  it('exports only private account data and prevents browser/proxy caching', () => {
    const exportHandler = handlers.find(h => h.route === '/v1/me/export')!;
    expect(exportHandler.source).toContain("res.setHeader('Cache-Control', 'no-store')");
    expect(exportHandler.source).toContain("eq('user_id', learnerId)");
    expect(exportHandler.source).toContain('decisionJournalEntries');
    expect(exportHandler.source).toContain('paperTradeSessions');
    expect(exportHandler.source).not.toMatch(/service[_-]?role/i);
    expect(exportHandler.source).not.toContain('access_token:');
    expect(exportHandler.source).toContain('No partial export was created');
  });

  it('filters every read of a learner-owned table by the verified learner id', () => {
    for (const handler of handlers) {
      const reads = [...handler.source.matchAll(/\.from\('([a-z_]+)'\)([\s\S]*?)(?=\.from\(|\n\}\);|$)/g)]
        .filter(match => LEARNER_TABLES.includes(match[1]) && !match[2].includes('.insert('));
      for (const read of reads) {
        expect(read[2], `${handler.route} → ${read[1]}`).toContain(".eq('user_id', req.learnerId!)");
      }
    }
  });

  it('never takes the learner id from the request', () => {
    expect(indexSource).not.toMatch(/req\.(body|query|params)\.(user_?id|learner_?id)/i);
    expect(indexSource).not.toMatch(/parsed\.data\.(user_?id|learner_?id)/i);
  });

  it('uses only the request-scoped client and never a service-role key', () => {
    expect(indexSource).not.toMatch(/service[_-]?role/i);
    expect(indexSource.match(/createClient\(/g)).toHaveLength(1);
    for (const handler of handlers.filter(h => h.route.startsWith('/v1/'))) {
      expect(handler.source, handler.route).not.toMatch(/createClient|supabaseAdmin/);
    }
  });

  it('does not select answer keys when serving scenarios', () => {
    const scenarios = handlers.find(h => h.route === '/v1/chart-dojo/scenarios')!;
    expect(scenarios.source).not.toMatch(/answer_?key/i);
    expect(scenarios.source).not.toContain("select('*')");
  });

  it('does not log request bodies or tokens', () => {
    expect(indexSource).not.toMatch(/console\.\w+\([^)]*(req\.body|authorization|token)/i);
  });
});

describe('request schemas reject attempts to act for another learner', () => {
  const attemptId = '0e7a6c7c-95c6-4d47-9e92-9c3ddf5c0a1e';
  const other = '5b1d2f0e-6a77-4a53-8f55-0d0a3b8f7a11';

  it('rejects a user id on a Chart Dojo attempt', () => {
    const body = { attemptId, scenarioId: 'TQ-SYN-004', choiceId: 'write-plan' };
    expect(chartDojoAttemptSchema.safeParse(body).success).toBe(true);
    expect(chartDojoAttemptSchema.safeParse({ ...body, userId: other }).success).toBe(false);
    expect(chartDojoAttemptSchema.safeParse({ ...body, user_id: other }).success).toBe(false);
  });

  it('rejects client-supplied outcomes or scores', () => {
    const body = { attemptId, scenarioId: 'TQ-SYN-004', choiceId: 'write-plan' };
    expect(chartDojoAttemptSchema.safeParse({ ...body, outcome: 'disciplined' }).success).toBe(false);
    expect(chartDojoAttemptSchema.safeParse({ ...body, xp: 500 }).success).toBe(false);
    expect(attemptSchema.safeParse({ lessonId: 'spread-basics', lessonVersion: '1', attemptId, score: 100,
      answers: [{ questionId: 'q', answerId: 'a' }] }).success).toBe(false);
    expect(progressEventSchema.safeParse({ eventId: attemptId, eventKey: 'risk-tool-used-v1', userId: other }).success).toBe(false);
  });
});

describe('database policies keep attempts private and answer keys server-only', () => {
  it('enables row level security with an own-rows read policy on attempt history', () => {
    expect(allMigrations).toMatch(/alter table public\.chart_dojo_attempts enable row level security/i);
    expect(allMigrations).toMatch(/create policy "Read own chart dojo attempts" on public\.chart_dojo_attempts\s+for select to authenticated using \(auth\.uid\(\) = user_id\)/i);
  });

  it('does not let learners write attempts directly', () => {
    expect(allMigrations).toMatch(/revoke insert, update, delete on public\.chart_dojo_attempts from anon, authenticated/i);
    expect(allMigrations).not.toMatch(/grant (insert|update|delete|all)[^;]*on public\.chart_dojo_attempts to (anon|authenticated)/i);
  });

  it('derives the learner from auth.uid() inside the scoring function, not from an argument', () => {
    const fn = allMigrations.match(/create or replace function public\.submit_chart_dojo_attempt\([\s\S]*?\n\$\$;/g)!.at(-1)!;
    expect(fn).toContain('v_user_id uuid := auth.uid()');
    expect(fn).not.toMatch(/p_user_id/);
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path = ''/i);
  });

  it('never grants the answer key column to learners', () => {
    const grants = [...allMigrations.matchAll(/grant select \(([^)]*)\)\s+on public\.chart_dojo_scenarios to (\w+)/gi)];
    expect(grants.length).toBeGreaterThan(0);
    for (const grant of grants) expect(grant[1]).not.toMatch(/answer_key/);
    expect(allMigrations).not.toMatch(/grant select on public\.chart_dojo_scenarios to (anon|authenticated)/i);
  });
});

describe('mastery summaries are computed only from the rows passed in', () => {
  const at = (n: number) => new Date(Date.UTC(2026, 9, 11, 12, n)).toISOString();

  it('does not carry state from one learner\'s call into the next', () => {
    const empty = buildMastery([]);
    buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-004', outcome: 'disciplined', submitted_at: at(2) },
    ], [{ lesson_id: 'spread-basics', score: 100, passed: true }], [{ event_key: 'risk-tool-used-v1' }]);
    expect(buildMastery([])).toEqual(empty);
  });

  it('does not mutate its inputs', () => {
    const attempts = Object.freeze([
      Object.freeze({ scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(2) }),
      Object.freeze({ scenario_id: 'TQ-SYN-004', outcome: 'undefined-risk', submitted_at: at(1) }),
    ]) as unknown as Array<{ scenario_id: string; outcome: string; submitted_at: string }>;
    expect(() => buildMastery(attempts)).not.toThrow();
    expect(attempts[0].scenario_id).toBe('TQ-SYN-001');
  });

  it('gives two learners with different histories independent summaries', () => {
    const a = buildMastery([{ scenario_id: 'TQ-SYN-002', outcome: 'risk-aware', submitted_at: at(1) }]);
    const b = buildMastery([{ scenario_id: 'TQ-SYN-002', outcome: 'risk-exceeded', submitted_at: at(1) }]);
    expect(a.skills.find(s => s.skillId === 'risk-management')!.successRate).toBe(100);
    expect(b.skills.find(s => s.skillId === 'risk-management')!.successRate).toBe(0);
  });
});

describe('paper trade session database privacy', () => {
  it('enables RLS and permits learners to read only their own sessions', () => {
    expect(allMigrations).toMatch(/alter table public\.paper_trade_sessions enable row level security/i);
    expect(allMigrations).toMatch(/create policy "Learners read own paper trade sessions" on public\.paper_trade_sessions\s+for select to authenticated using \(auth\.uid\(\) = user_id\)/i);
    expect(allMigrations).not.toMatch(/grant (?:insert|update|delete|all) on public\.paper_trade_sessions to authenticated/i);
  });

  it('exposes only authenticated server-side session transition functions', () => {
    expect(allMigrations).toMatch(/create or replace function public\.start_paper_trade_session[\s\S]*?security definer set search_path = ''/i);
    expect(allMigrations).toMatch(/create or replace function public\.advance_paper_trade_session[\s\S]*?security definer set search_path = ''/i);
    expect(allMigrations).toMatch(/grant execute on function public\.advance_paper_trade_session\(uuid,integer\) to authenticated/i);
    expect(allMigrations).toMatch(/if v_hit_stop and v_hit_target then[\s\S]*?ambiguous-stop-first/i);
  });
});

describe('decision journal database privacy', () => {
  it('enables row-level security and restricts every journal operation to the owning learner', () => {
    expect(allMigrations).toMatch(/alter table public\.decision_journal_entries enable row level security/i);
    expect(allMigrations).toMatch(/create policy "Learners read own decision journal" on public\.decision_journal_entries\s+for select to authenticated using \(auth\.uid\(\) = user_id\)/i);
    expect(allMigrations).toMatch(/create policy "Learners create own decision journal" on public\.decision_journal_entries\s+for insert to authenticated with check \(auth\.uid\(\) = user_id\)/i);
    expect(allMigrations).toMatch(/create policy "Learners update own decision journal" on public\.decision_journal_entries\s+for update to authenticated using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
    expect(allMigrations).toMatch(/create policy "Learners delete own decision journal" on public\.decision_journal_entries\s+for delete to authenticated using \(auth\.uid\(\) = user_id\)/i);
  });
});
