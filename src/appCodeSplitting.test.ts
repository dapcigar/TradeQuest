import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

describe('route-level module loading', () => {
  it('loads heavy learning routes on demand instead of in the initial app bundle', () => {
    for (const moduleName of [
      'JournalView', 'AdaptivePractice', 'WeeklyPracticePlan', 'GlossaryView',
      'BacktestingEvidenceLiteracyLab', 'ReplayLab', 'PaperTradeLab',
      'CommunityProfile', 'CommunityChallenges',
    ]) {
      expect(app, moduleName + ' should be lazy-loaded').toContain(
        `lazy(() => import('./${moduleName}'))`,
      );
    }
  });

  it('provides an accessible loading status while a route chunk loads', () => {
    expect(app).toMatch(/<Suspense fallback=\{<div className="panel module-loading" role="status">Loading learning module…<\/div>\}>/);
  });
});
