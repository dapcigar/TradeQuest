import { describe, expect, it } from 'vitest';
import { assessRiskRewardAnswer, riskRewardQuestions } from './riskRewardLiteracy';

describe('risk and reward literacy', () => {
  it('covers ratio interpretation, evidence quality, and respecting a risk budget', () => {
    expect(riskRewardQuestions.map(question => question.id)).toEqual(['compare-loss', 'win-rate', 'risk-budget']);
    expect(riskRewardQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('does not treat a larger possible reward as a prediction', () => {
    const result = assessRiskRewardAnswer('compare-loss', 'ratio');
    expect(result?.correct).toBe(true);
    expect(result?.explanation).toContain('does not establish an edge');
  });

  it('reinforces evidence over win-rate-only claims', () => {
    expect(assessRiskRewardAnswer('win-rate', 'win-rate-only')?.correct).toBe(false);
    expect(assessRiskRewardAnswer('win-rate', 'full-sample')?.correct).toBe(true);
  });

  it('keeps the risk budget as a constraint and rejects unknown inputs', () => {
    expect(assessRiskRewardAnswer('risk-budget', 'rework')?.correct).toBe(true);
    expect(assessRiskRewardAnswer('risk-budget', 'increase')?.correct).toBe(false);
    expect(assessRiskRewardAnswer('unknown', 'rework')).toBeNull();
    expect(assessRiskRewardAnswer('risk-budget', 'unknown')).toBeNull();
  });
});
