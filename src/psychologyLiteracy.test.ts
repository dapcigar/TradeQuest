import { describe, expect, it } from 'vitest';
import { assessPsychologyAnswer, psychologyQuestions } from './psychologyLiteracy';

describe('trading psychology literacy', () => {
  it('covers outcome bias, fear of missing out, and confirmation bias', () => {
    expect(psychologyQuestions.map(question => question.id)).toEqual(['outcome-bias', 'fomo', 'confirmation-bias']);
    expect(psychologyQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
    expect(assessPsychologyAnswer('outcome-bias', 'review-process')?.correct).toBe(true);
    expect(assessPsychologyAnswer('fomo', 'chase')?.correct).toBe(false);
    expect(assessPsychologyAnswer('confirmation-bias', 'seek-disconfirming')?.correct).toBe(true);
  });

  it('rejects unknown questions and options', () => {
    expect(assessPsychologyAnswer('unknown', 'wait-or-pass')).toBeNull();
    expect(assessPsychologyAnswer('fomo', 'not-an-option')).toBeNull();
  });

  it('does not frame psychology tools as certainty or guaranteed performance', () => {
    const text = psychologyQuestions.map(question => question.explanation + ' ' + question.prompt).join(' ').toLowerCase();
    expect(text).toContain('uncertainty');
    expect(text).toContain('guarantee');
  });
});
