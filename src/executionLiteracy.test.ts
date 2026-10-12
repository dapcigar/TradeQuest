import { describe, expect, it } from 'vitest';
import { assessExecutionAnswer, executionQuestions } from './executionLiteracy';

describe('order and execution literacy', () => {
  it('covers market orders, limit-order trade-offs, and slippage', () => {
    expect(executionQuestions.map(question => question.id)).toEqual(['market-order', 'limit-order', 'slippage']);
    expect(executionQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
    expect(assessExecutionAnswer('market-order', 'execution-priority')?.correct).toBe(true);
    expect(assessExecutionAnswer('limit-order', 'guaranteed-fill')?.correct).toBe(false);
    expect(assessExecutionAnswer('slippage', 'slippage')?.correct).toBe(true);
  });

  it('rejects unknown questions and options', () => {
    expect(assessExecutionAnswer('unknown', 'slippage')).toBeNull();
    expect(assessExecutionAnswer('limit-order', 'unknown')).toBeNull();
  });

  it('does not imply guaranteed price, execution, or profit', () => {
    const content = executionQuestions.map(question => question.prompt + ' ' + question.explanation + ' ' + question.options.map(option => option.label).join(' ')).join(' ').toLowerCase();
    expect(content).toContain('not guaranteed');
    expect(content).toContain('may not fill');
    expect(content).toContain('slippage');
  });
});
