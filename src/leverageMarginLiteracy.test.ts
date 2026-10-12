import { describe, expect, it } from 'vitest';
import { assessLeverageAnswer, leverageQuestions } from './leverageMarginLiteracy';

describe('leverage and margin literacy', () => {
  it('has a valid answer for each question', () => {
    expect(leverageQuestions.map(question => question.id)).toEqual(['exposure', 'margin', 'response']);
    expect(leverageQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('explains that leverage magnifies exposure, not the chance of winning', () => {
    expect(assessLeverageAnswer('exposure', 'exposure')?.correct).toBe(true);
    expect(assessLeverageAnswer('exposure', 'profit')?.correct).toBe(false);
    expect(assessLeverageAnswer('exposure', 'exposure')?.explanation).toContain('does not improve the probability');
  });

  it('distinguishes margin from a loss limit', () => {
    expect(assessLeverageAnswer('margin', 'buffer')?.correct).toBe(true);
    expect(assessLeverageAnswer('margin', 'risk-limit')?.correct).toBe(false);
  });

  it('rejects unknown question and option identifiers', () => {
    expect(assessLeverageAnswer('unknown', 'review')).toBeNull();
    expect(assessLeverageAnswer('response', 'unknown')).toBeNull();
  });
});
