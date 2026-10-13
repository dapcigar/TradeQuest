import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const register = readFileSync(resolve(root, 'docs/CONTENT_REVIEW_REGISTER.md'), 'utf8');

const routeSection = register.split('## Learner-facing content route coverage')[1]?.split('## Editorial checklist')[0] ?? '';
const learningRoutePattern = /const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\('\.\/([^']+)'\)\)/g;
const reviewedLearningComponents = new Set([
  'AdaptivePractice',
  'GlossaryView',
  'CandleLiteracy',
  'SupportResistanceLiteracy',
  'TrendStructureLiteracy',
  'BreakoutLiteracy',
  'RiskRewardLiteracy',
  'LeverageMarginLiteracy',
  'PositionSizingLiteracy',
  'DrawdownLiteracy',
  'PsychologyLiteracy',
  'ExecutionLiteracy',
  'MarketConditionsLiteracy',
  'BacktestingEvidenceLiteracy',
  'AssetClassLiteracy',
  'TradePlanLiteracy',
  'ReplayLab',
  'PaperTradeLab',
]);

describe('curriculum review register coverage', () => {
  it('registers every learner-facing curriculum route component', () => {
    const matches = [...app.matchAll(learningRoutePattern)];
    const routes = matches.filter(match => reviewedLearningComponents.has(match[1]));
    expect(routes.map(match => match[1]).sort()).toEqual([...reviewedLearningComponents].sort());

    for (const [, component, moduleName] of routes) {
      expect(routeSection, `${component} must be present in the content review register`).toContain(`src/${moduleName}.tsx`);
    }
  });

  it('references existing route components and supporting evidence files', () => {
    const pathPattern = /`((?:src|server\/src|docs)\/[^ `|]+)`/g;
    const paths = [...routeSection.matchAll(pathPattern)].map(match => match[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(existsSync(resolve(root, path)), `register path must exist: ${path}`).toBe(true);
    }
  });

  it('keeps human editorial sign-off explicitly pending until a reviewer records approval', () => {
    const rows = routeSection.split('\n').filter(line => line.startsWith('| ') && !line.startsWith('| Learning route'));
    expect(rows.length).toBe(reviewedLearningComponents.size);
    for (const row of rows) expect(row.trim().endsWith('| Pending |')).toBe(true);
  });
});
