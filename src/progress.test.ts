import { describe, expect, it } from 'vitest';
import { awardProgressXPOnce, normaliseProgress, type ProgressState } from './progress';

const initial: ProgressState = {
  lessonComplete: false,
  quizCorrect: false,
  riskToolUsed: false,
  xp: 120,
  awardedActions: [],
};

describe('normaliseProgress', () => {
  it('rejects malformed stored values and returns safe defaults', () => {
    expect(normaliseProgress(null, initial)).toEqual(initial);
    expect(normaliseProgress('not an object', initial)).toEqual(initial);
    expect(normaliseProgress([], initial)).toEqual(initial);
  });

  it('clamps invalid fields and deduplicates action IDs', () => {
    expect(normaliseProgress({
      lessonComplete: 'yes',
      quizCorrect: true,
      riskToolUsed: false,
      xp: -500,
      awardedActions: ['chart-1', 'chart-1', 4, 'lesson-1'],
    }, initial)).toEqual({
      lessonComplete: false,
      quizCorrect: true,
      riskToolUsed: false,
      xp: 120,
      awardedActions: ['chart-1', 'lesson-1'],
    });
  });

  it('caps implausibly large stored XP', () => {
    expect(normaliseProgress({ ...initial, xp: 9_999_999 }, initial).xp).toBe(1_000_000);
  });
});

describe('awardProgressXPOnce', () => {
  it('awards an action once even if it is requested repeatedly', () => {
    const first = awardProgressXPOnce(initial, 'lesson-1', 40);
    const second = awardProgressXPOnce(first, 'lesson-1', 40);
    expect(first.xp).toBe(160);
    expect(second.xp).toBe(160);
    expect(second.awardedActions).toEqual(['lesson-1']);
  });

  it('rejects invalid awards', () => {
    expect(() => awardProgressXPOnce(initial, '', 10)).toThrow();
    expect(() => awardProgressXPOnce(initial, 'bad-xp', -1)).toThrow();
  });
});
