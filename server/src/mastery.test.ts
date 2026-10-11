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
});
