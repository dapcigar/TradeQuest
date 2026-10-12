import { describe, expect, it } from 'vitest';
import { assessTrendAnswer, trendQuestions } from './trendStructure';

describe('trend and market structure literacy', () => {
  it('covers rising structure, falling structure, and ranges', () => {
    expect(trendQuestions.map(question => question.id)).toEqual(['rising', 'falling', 'range']);
    expect(trendQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('describes higher highs and higher lows without promising continuation', () => {
    expect(assessTrendAnswer('rising', 'up-structure')).toEqual({
      correct: true,
      explanation: expect.stringContaining('do not guarantee continuation'),
    });
  });

  it('rejects guaranteed-trade conclusions', () => {
    expect(assessTrendAnswer('falling', 'short-now')?.correct).toBe(false);
    expect(assessTrendAnswer('rising', 'guaranteed')?.explanation).toContain('do not guarantee continuation');
  });

  it('rejects unknown questions and options', () => {
    expect(assessTrendAnswer('unknown', 'range')).toBeNull();
    expect(assessTrendAnswer('range', 'unknown')).toBeNull();
  });
});
