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
  });
  it('uses lower positive-decision rate to break ties in practice count', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined' },
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-exceeded' },
      { scenario_id: 'TQ-SYN-003', outcome: 'evidence-led' },
    ]);
    expect(result.recommendation.scenarioId).toBe('TQ-SYN-002');
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
