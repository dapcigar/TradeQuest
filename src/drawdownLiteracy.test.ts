import { describe, expect, it } from 'vitest';
import { assessDrawdownAnswer, calculateDrawdown, drawdownQuestions } from './drawdownLiteracy';

describe('drawdown literacy', () => {
  it('calculates peak-to-current drawdown and asymmetric recovery', () => {
    expect(calculateDrawdown(1000, 900)).toEqual({ amount: 100, percent: 10, recoveryPercent: 100 / 9 });
    expect(calculateDrawdown(1000, 1000)).toEqual({ amount: 0, percent: 0, recoveryPercent: 0 });
    expect(calculateDrawdown(1000, 0)?.recoveryPercent).toBeNull();
  });

  it('rejects invalid equity values rather than inventing a result', () => {
    expect(calculateDrawdown(0, 0)).toBeNull();
    expect(calculateDrawdown(1000, 1100)).toBeNull();
    expect(calculateDrawdown(-1, 500)).toBeNull();
    expect(calculateDrawdown(Number.NaN, 500)).toBeNull();
  });

  it('covers drawdown, recovery asymmetry, and response to a losing streak', () => {
    expect(drawdownQuestions.map(question => question.id)).toEqual(['drawdown-measure', 'recovery-asymmetry', 'loss-streak']);
    expect(drawdownQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
    expect(assessDrawdownAnswer('drawdown-measure', '10-percent')?.correct).toBe(true);
    expect(assessDrawdownAnswer('recovery-asymmetry', '10-percent')?.correct).toBe(false);
    expect(assessDrawdownAnswer('loss-streak', 'pause-review')?.correct).toBe(true);
    expect(assessDrawdownAnswer('loss-streak', 'increase-size')?.correct).toBe(false);
    expect(assessDrawdownAnswer('unknown', 'pause-review')).toBeNull();
    expect(assessDrawdownAnswer('loss-streak', 'unknown')).toBeNull();
  });
});
