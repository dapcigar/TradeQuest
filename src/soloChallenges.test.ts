import { describe, expect, it } from 'vitest';
import { soloChallenges, summariseChallengeAttempts } from './soloChallenges';

describe('solo challenge rubric results', () => {
  it('keeps the rubric tied to the latest attempt, not the best historical score', () => {
    const attempts = [
      { scenarioId: 'TQ-SYN-003', outcome: 'impulsive', feedback: 'Earlier error', submittedAt: '2026-10-10T10:00:00Z' },
      { scenarioId: 'TQ-SYN-003', outcome: 'evidence-led', feedback: 'Latest evidence-led choice', submittedAt: '2026-10-11T10:00:00Z' },
    ];
    expect(summariseChallengeAttempts(attempts, 'TQ-SYN-003', 'evidence-led')).toEqual({
      attempts: 2,
      latestOutcome: 'evidence-led',
      latestFeedback: 'Latest evidence-led choice',
      latestSubmittedAt: '2026-10-11T10:00:00Z',
      rubricMet: true,
    });
    expect(summariseChallengeAttempts([...attempts].reverse(), 'TQ-SYN-003', 'evidence-led').rubricMet).toBe(true);
  });

  it('does not count unrelated scenarios as challenge attempts', () => {
    const summary = summariseChallengeAttempts([
      { scenarioId: 'TQ-SYN-001', outcome: 'disciplined', feedback: 'Not this challenge', submittedAt: '2026-10-11T10:00:00Z' },
    ], 'TQ-SYN-003', 'evidence-led');
    expect(summary.attempts).toBe(0);
    expect(summary.rubricMet).toBeNull();
  });

  it('does not treat a risk challenge as passed because of an evidence outcome', () => {
    const summary = summariseChallengeAttempts([
      { scenarioId: 'TQ-SYN-002', outcome: 'evidence-led', feedback: 'Wrong rubric', submittedAt: '2026-10-11T10:00:00Z' },
    ], 'TQ-SYN-002', 'risk-aware');
    expect(summary.rubricMet).toBe(false);
  });

  it('uses only curated process-based challenges and never P/L as a score', () => {
    expect(soloChallenges).toHaveLength(2);
    expect(soloChallenges.map(challenge => challenge.positiveOutcome)).toEqual(['evidence-led', 'risk-aware']);
    expect(soloChallenges.every(challenge => !/profit|pnl|p&l/i.test(challenge.rubric))).toBe(true);
  });
});
