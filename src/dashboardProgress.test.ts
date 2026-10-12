import { describe, expect, it } from 'vitest';
import { resolveDashboardProgress, type DashboardProgress } from './dashboardProgress';

const demo: DashboardProgress = {
  lessonComplete: true,
  quizCorrect: true,
  xp: 120,
  riskToolUsed: true,
  awardedActions: ['demo-action'],
};

describe('resolveDashboardProgress', () => {
  it('keeps anonymous demo progress browser-local', () => {
    expect(resolveDashboardProgress(false, null, demo)).toBe(demo);
  });

  it('uses account-backed lesson, XP, and risk-tool evidence when signed in', () => {
    expect(resolveDashboardProgress(true, {
      xp: 75,
      lessons_completed: ['spread-basics'],
      events: ['foundations-lesson-01', 'risk-tool-used-v1'],
    }, demo)).toEqual({
      lessonComplete: true,
      quizCorrect: true,
      xp: 75,
      riskToolUsed: true,
      awardedActions: [],
    });
  });

  it('never falls back to browser demo progress while account progress is loading or unavailable', () => {
    expect(resolveDashboardProgress(true, null, demo)).toEqual({
      lessonComplete: false,
      quizCorrect: false,
      xp: 0,
      riskToolUsed: false,
      awardedActions: [],
    });
  });

  it('does not infer completion or risk-tool use from unrelated account events', () => {
    expect(resolveDashboardProgress(true, {
      xp: 10,
      lessons_completed: [],
      events: ['foundations-lesson-01'],
    }, demo)).toEqual({
      lessonComplete: false,
      quizCorrect: false,
      xp: 10,
      riskToolUsed: false,
      awardedActions: [],
    });
  });
});
