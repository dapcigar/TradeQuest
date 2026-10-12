import { describe, expect, it } from 'vitest';
import { assessCandleAnswer, candleQuestions } from './candleLiteracy';

describe('candle literacy lesson', () => {
  it('provides distinct checks for body, wick, and candle direction', () => {
    expect(candleQuestions.map(question => question.id)).toEqual(['body', 'wick', 'direction']);
    expect(candleQuestions.every(question => question.options.length >= 3 && question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('assesses a correct answer and explains the concept', () => {
    expect(assessCandleAnswer('body', 'open-close')).toEqual({ correct: true, explanation: expect.stringContaining('open and close') });
  });

  it('corrects certainty claims about the future', () => {
    const result = assessCandleAnswer('wick', 'reversal');
    expect(result?.correct).toBe(false);
    expect(result?.explanation).toContain('cannot guarantee');
  });

  it('rejects unknown questions and options', () => {
    expect(assessCandleAnswer('unknown', 'open-close')).toBeNull();
    expect(assessCandleAnswer('body', 'unknown')).toBeNull();
  });
});
