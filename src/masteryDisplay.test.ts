import { describe, expect, it } from 'vitest';
import { confidenceLabel, describeEvidence, describeTransfer } from './masteryDisplay';

describe('describeEvidence', () => {
  it('says nothing has happened yet rather than showing 0%', () => {
    expect(describeEvidence({ attempts: 0, positiveDecisions: 0, successRate: null, confidence: 'not-enough-evidence' })).toBe('None yet');
  });

  it('shows a raw count, not a percentage, while evidence is thin', () => {
    const text = describeEvidence({ attempts: 2, positiveDecisions: 2, successRate: 100, confidence: 'not-enough-evidence' });
    expect(text).toBe('2 of 2 positive · too few to judge');
    expect(text).not.toContain('%');
  });

  it('shows a percentage with its confidence once there is an early signal', () => {
    expect(describeEvidence({ attempts: 3, positiveDecisions: 2, successRate: 67, confidence: 'early-signal' }))
      .toBe('67% positive (2 of 3 positive) · early signal');
  });

  it('does not show a percentage when the rate is missing', () => {
    expect(describeEvidence({ attempts: 3, positiveDecisions: 0, successRate: null, confidence: 'early-signal' })).not.toContain('%');
  });
});

describe('describeTransfer', () => {
  const base = { attempts: 1, positiveDecisions: 1, successRate: 100, confidence: 'not-enough-evidence' };

  it('reports missing transfer evidence plainly', () => {
    expect(describeTransfer({ ...base, transferAttempts: 0, transferPositiveDecisions: 0 })).toBe('No transfer evidence yet');
  });

  it('reports counts of new-scenario decisions', () => {
    expect(describeTransfer({ ...base, transferAttempts: 2, transferPositiveDecisions: 1 })).toContain('1 of 2');
  });
});

describe('confidenceLabel', () => {
  it('treats unknown values as insufficient evidence', () => {
    expect(confidenceLabel('mastered')).toBe('too few to judge');
  });
});
