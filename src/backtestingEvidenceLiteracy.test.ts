import { describe, expect, it } from 'vitest';
import { assessBacktestingAnswer, backtestingQuestions } from './backtestingEvidenceLiteracy';

describe('backtesting evidence literacy', () => {
  it('covers small samples, overfitting, and robust test design', () => {
    expect(backtestingQuestions.map(question => question.id)).toEqual(['small-sample', 'overfitting', 'test-design']);
    expect(backtestingQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
    expect(assessBacktestingAnswer('small-sample', 'limited')?.correct).toBe(true);
    expect(assessBacktestingAnswer('overfitting', 'certainty')?.correct).toBe(false);
    expect(assessBacktestingAnswer('test-design', 'robust')?.correct).toBe(true);
  });

  it('rejects unknown questions and options', () => {
    expect(assessBacktestingAnswer('unknown', 'limited')).toBeNull();
    expect(assessBacktestingAnswer('test-design', 'unknown')).toBeNull();
  });

  it('explicitly describes overfitting and the limits of past results', () => {
    const content = backtestingQuestions.map(question => question.prompt + ' ' + question.explanation + ' ' + question.options.map(option => option.label).join(' ')).join(' ').toLowerCase();
    expect(content).toContain('overfitting');
    expect(content).toContain('out-of-sample');
    expect(content).toContain('does not guarantee future results');
  });
});
