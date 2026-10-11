import { describe, expect, it } from 'vitest';
import { buildMastery } from './mastery.js';

describe('buildMastery', () => {
  it('starts with the least-practised skill and does not overstate confidence', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined' },
      { scenario_id: 'TQ-SYN-001', outcome: 'undefined-risk' },
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-aware' },
    ]);
    expect(result.recommendation.scenarioId).toBe('TQ-SYN-003');
    expect(result.recommendation.confidence).toBe('not-enough-evidence');
    expect(result.skills.find(skill => skill.skillId === 'planning')?.successRate).toBe(50);
    expect(result.skills.find(skill => skill.skillId === 'planning')?.confidence).toBe('not-enough-evidence');
  });

  it('uses lower positive-decision rate to break ties in practice count', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined' },
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-exceeded' },
      { scenario_id: 'TQ-SYN-003', outcome: 'evidence-led' },
    ]);
    // Skill 2 has the lowest positive rate; the recommendation is an unseen variant of it.
    expect(result.recommendation.skillId).toBe('risk-management');
    expect(result.recommendation.scenarioId).not.toBe('TQ-SYN-002');
  });

  it('prioritises a skill last practised at least 14 days ago for spaced review', () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-09-20T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-09-21T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-aware', submitted_at: '2026-10-10T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-003', outcome: 'evidence-led', submitted_at: '2026-10-10T12:00:00.000Z' },
    ], [], [], now);
    // Review is offered on a scenario the learner has not seen, so it tests the idea rather than a remembered answer.
    expect(result.recommendation.skillId).toBe('planning');
    expect(['TQ-SYN-004', 'TQ-SYN-005']).toContain(result.recommendation.scenarioId);
    expect(result.recommendation.reviewStatus).toBe('review-due');
    expect(result.recommendation.reason).toContain('at least 14 days ago');
    expect(result.skills.find(skill => skill.scenarioId === 'TQ-SYN-001')?.lastPractisedAt).toBe('2026-09-21T12:00:00.000Z');
  });

  it('does not mark skills due when timestamps are absent or invalid', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: 'not-a-date' },
    ], [], [], new Date('2026-10-11T12:00:00.000Z'));
    expect(result.skills.find(skill => skill.scenarioId === 'TQ-SYN-001')?.reviewStatus).toBe('date-unavailable');
    expect(result.recommendation.scenarioId).toBe('TQ-SYN-002');
  });

  it('does not strengthen confidence from repeated attempts without delayed positive retention', () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-10-01T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'undefined-risk', submitted_at: '2026-10-02T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-10-03T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-10-04T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-10-05T12:00:00.000Z' },
    ], [], [], now);
    const planning = result.skills.find(skill => skill.skillId === 'planning');
    expect(planning?.confidence).toBe('early-signal');
    expect(planning?.retentionStatus).toBe('awaiting-delayed-review');
    expect(planning?.delayedReviewAttempts).toBe(0);
    expect(planning?.firstAttemptPositive).toBe(true);
  });

  it('only marks retained understanding after a positive attempt following a 14-day gap', () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-09-01T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'undefined-risk', submitted_at: '2026-09-02T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: '2026-09-20T12:00:00.000Z' },
    ], [], [], now);
    const planning = result.skills.find(skill => skill.skillId === 'planning');
    expect(planning?.delayedReviewAttempts).toBe(1);
    expect(planning?.retentionStatus).toBe('retained-after-review');
    expect(planning?.confidence).toBe('building');
    expect(result.recommendation.retentionStatus).toBe('retained-after-review');
  });

  it('flags an unsuccessful delayed review for reinforcement', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-aware', submitted_at: '2026-09-01T12:00:00.000Z' },
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-exceeded', submitted_at: '2026-09-20T12:00:00.000Z' },
    ], [], [], new Date('2026-10-11T12:00:00.000Z'));
    expect(result.skills.find(skill => skill.skillId === 'risk-management')?.retentionStatus).toBe('needs-reinforcement');
    expect(result.skills.find(skill => skill.skillId === 'risk-management')?.confidence).toBe('not-enough-evidence');
  });

  it('returns all skills with unknown rates when there is no history', () => {
    const result = buildMastery([]);
    expect(result.skills).toHaveLength(3);
    expect(result.skills.every(skill => skill.successRate === null)).toBe(true);
    expect(result.sampleSize).toBe(0);
  });

  it('adds lesson outcomes but treats risk-tool use as participation only', () => {
    const result = buildMastery(
      [{ scenario_id: 'TQ-SYN-001', outcome: 'disciplined' }],
      [
        { lesson_id: 'spread-basics', score: 100, passed: true },
        { lesson_id: 'spread-basics', score: 40, passed: false },
      ],
      [{ event_key: 'risk-tool-used-v1' }],
    );
    const spread = result.learningSignals.find(signal => signal.signalId === 'spread-basics');
    const risk = result.learningSignals.find(signal => signal.signalId === 'risk-tool-used-v1');
    expect(spread?.attempts).toBe(2);
    expect(spread?.successRate).toBe(50);
    expect(risk?.attempts).toBe(1);
    expect(risk?.successRate).toBeNull();
    expect(risk?.confidence).toBe('participation-only');
  });
});
