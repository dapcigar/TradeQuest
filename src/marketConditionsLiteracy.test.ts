import { describe, expect, it } from 'vitest';
import { assessMarketConditionsAnswer, marketConditionsQuestions } from './marketConditionsLiteracy';

describe('market conditions literacy', () => {
  it('covers liquidity, volatility, and session context', () => {
    expect(marketConditionsQuestions.map(question => question.id)).toEqual(['liquidity', 'volatility', 'sessions']);
    expect(marketConditionsQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
    expect(assessMarketConditionsAnswer('liquidity', 'liquidity')?.correct).toBe(true);
    expect(assessMarketConditionsAnswer('volatility', 'same-risk')?.correct).toBe(false);
    expect(assessMarketConditionsAnswer('sessions', 'schedule')?.correct).toBe(true);
  });

  it('rejects unknown questions and options', () => {
    expect(assessMarketConditionsAnswer('unknown', 'liquidity')).toBeNull();
    expect(assessMarketConditionsAnswer('sessions', 'unknown')).toBeNull();
  });

  it('avoids predictive or guaranteed-outcome claims', () => {
    const content = marketConditionsQuestions.map(question => question.prompt + ' ' + question.explanation + ' ' + question.options.map(option => option.label).join(' ')).join(' ').toLowerCase();
    expect(content).toContain('does not predict direction');
    expect(content).toContain('liquidity tells you whether price will rise or fall');
    expect(content).toContain('guarantees');
  });
});
