import { describe, expect, it } from 'vitest';
import { adaptiveEvidence, assessAdaptiveAnswer, nextAdaptiveVariant } from './adaptivePractice';

describe('adaptive practice engine', () => {
  it('marks risk-first answers positively and rejects unknown choices', () => {
    expect(assessAdaptiveAnswer('risk-definition-a', 'define').positive).toBe(true);
    expect(assessAdaptiveAnswer('risk-definition-a', 'enter').positive).toBe(false);
    expect(() => assessAdaptiveAnswer('risk-definition-a', 'not-an-option')).toThrow('Choose an available answer.');
  });
  it('selects an unseen variant rather than repeating a completed variant', () => {
    const first = nextAdaptiveVariant([]);
    const second = nextAdaptiveVariant([{ variantId: first.id, skill: first.skill, positive: true, at: '2026-01-01T00:00:00.000Z' }]);
    expect(second.id).not.toBe(first.id);
  });
  it('keeps recall and transfer evidence separate and avoids overclaiming with small samples', () => {
    const evidence = adaptiveEvidence([
      { variantId: 'risk-definition-a', skill: 'risk-definition', positive: true, at: '2026-01-01' },
      { variantId: 'risk-definition-b', skill: 'risk-definition', positive: false, at: '2026-01-02' },
    ], 'risk-definition');
    expect(evidence.recallAttempts).toBe(1);
    expect(evidence.transferAttempts).toBe(1);
    expect(evidence.confidence).toBe('too-few-to-judge');
  });
});
