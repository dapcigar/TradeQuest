import { describe, expect, it } from 'vitest';
import { adaptiveEvidenceFromSummary, nextAdaptiveVariant, nextAdaptiveVariantFromSummary, recordAdaptiveSummaryAttempt, type AdaptiveAttemptSummary } from './AdaptivePractice';

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


const emptySummary: AdaptiveAttemptSummary[] = [
  { scenarioId: 'TQ-SYN-019', attemptCount: 0, positiveCount: 0, lastSubmittedAt: null },
  { scenarioId: 'TQ-SYN-020', attemptCount: 0, positiveCount: 0, lastSubmittedAt: null },
  { scenarioId: 'TQ-SYN-021', attemptCount: 0, positiveCount: 0, lastSubmittedAt: null },
  { scenarioId: 'TQ-SYN-022', attemptCount: 0, positiveCount: 0, lastSubmittedAt: null },
  { scenarioId: 'TQ-SYN-023', attemptCount: 0, positiveCount: 0, lastSubmittedAt: null },
  { scenarioId: 'TQ-SYN-024', attemptCount: 0, positiveCount: 0, lastSubmittedAt: null },
];

describe('complete adaptive-practice summaries', () => {
  it('chooses an unseen variant from the least-evidenced skill using all retained counts', () => {
    const summaries = emptySummary.map(item => item.scenarioId === 'TQ-SYN-019'
      ? { ...item, attemptCount: 601, positiveCount: 400, lastSubmittedAt: '2026-10-11T10:00:00Z' }
      : item.scenarioId === 'TQ-SYN-020'
        ? { ...item, attemptCount: 600, positiveCount: 400, lastSubmittedAt: '2026-10-10T10:00:00Z' }
        : item);
    const next = nextAdaptiveVariantFromSummary(summaries);
    expect(next.skill).toBe('evidence-patience');
    expect(next.id).toBe('evidence-patience-a');
  });

  it('reports recall and transfer evidence from aggregate lifetime counts', () => {
    const summaries = emptySummary.map(item => item.scenarioId === 'TQ-SYN-019'
      ? { ...item, attemptCount: 9, positiveCount: 7 }
      : item.scenarioId === 'TQ-SYN-020'
        ? { ...item, attemptCount: 4, positiveCount: 2 }
        : item);
    expect(adaptiveEvidenceFromSummary(summaries, 'risk-definition')).toEqual({
      recallAttempts: 9, recallPositive: 7, transferAttempts: 4, transferPositive: 2, confidence: 'early-signal',
    });
  });

  it('updates account-backed summary counts after a newly saved answer', () => {
    const updated = recordAdaptiveSummaryAttempt(emptySummary, 'TQ-SYN-021', true, '2026-10-12T10:00:00Z');
    expect(updated.find(item => item.scenarioId === 'TQ-SYN-021')).toEqual({
      scenarioId: 'TQ-SYN-021', attemptCount: 1, positiveCount: 1, lastSubmittedAt: '2026-10-12T10:00:00Z',
    });
  });
});
