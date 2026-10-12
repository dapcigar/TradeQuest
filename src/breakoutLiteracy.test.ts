import { describe, expect, it } from 'vitest';
import { assessBreakoutAnswer, breakoutQuestions } from './breakoutLiteracy';

describe('breakout and false-breakout literacy', () => {
  it('covers failed attempts, uncertainty after a close, and risk planning', () => {
    expect(breakoutQuestions.map(question => question.id)).toEqual(['close', 'wait', 'plan']);
    expect(breakoutQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('does not treat a brief move outside a range as a guarantee', () => {
    expect(assessBreakoutAnswer('close', 'rejected')).toEqual({
      correct: true,
      explanation: expect.stringContaining('does not establish what happens next'),
    });
    expect(assessBreakoutAnswer('close', 'confirmed')?.correct).toBe(false);
  });

  it('keeps breakout observations separate from predictions', () => {
    expect(assessBreakoutAnswer('wait', 'limited')?.explanation).toContain('not proof of continuation');
  });

  it('reinforces defined risk and permits waiting or passing', () => {
    expect(assessBreakoutAnswer('plan', 'plan')?.correct).toBe(true);
    expect(assessBreakoutAnswer('plan', 'chase')?.correct).toBe(false);
  });

  it('rejects unknown questions and options', () => {
    expect(assessBreakoutAnswer('unknown', 'plan')).toBeNull();
    expect(assessBreakoutAnswer('close', 'unknown')).toBeNull();
  });
});
