import { describe, expect, it } from 'vitest';
import { assessSpreadAnswer } from './learning';

describe('assessSpreadAnswer', () => {
  it('does not submit an unanswered question', () => {
    expect(assessSpreadAnswer(null)).toBeNull();
    expect(assessSpreadAnswer('')).toBeNull();
  });

  it('explains why the spread answer is correct', () => {
    expect(assessSpreadAnswer('spread')).toEqual({
      correct: true,
      message: 'Correct. The spread is the difference between the bid and ask prices. It is one of the costs to understand before evaluating a trade.',
      nextStep: 'continue',
    });
  });

  it('distinguishes commission from spread', () => {
    const result = assessSpreadAnswer('commission');
    expect(result?.correct).toBe(false);
    expect(result?.nextStep).toBe('retry');
    expect(result?.message).toContain('A commission is a separate fee');
  });

  it('explains leverage without suggesting it is a fee', () => {
    const result = assessSpreadAnswer('leverage');
    expect(result?.correct).toBe(false);
    expect(result?.message).toContain('Leverage changes exposure');
  });

  it('handles unexpected choices defensively', () => {
    expect(assessSpreadAnswer('unexpected')?.nextStep).toBe('retry');
  });
});
