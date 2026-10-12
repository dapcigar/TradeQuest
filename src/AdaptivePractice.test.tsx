import { describe, expect, it } from 'vitest';
import { nextAdaptiveVariant } from './AdaptivePractice';

describe('account-backed adaptive practice history window', () => {
  it('continues to recommend a less-practised skill after more than fifty saved attempts', () => {
    const attempts = Array.from({ length: 120 }, (_, index) => ({
      variantId: 'risk-definition-a',
      skill: 'risk-definition' as const,
      positive: index % 2 === 0,
      at: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
    }));
    const next = nextAdaptiveVariant(attempts);
    expect(next.skill).toBe('evidence-patience');
    expect(next.id).toBe('evidence-patience-a');
  });
});
