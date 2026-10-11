import { describe, expect, it } from 'vitest';
import { buildMastery } from './mastery.js';

const at = (n: number) => new Date(Date.UTC(2026, 9, 11, 12, n)).toISOString();
const planning = (result: ReturnType<typeof buildMastery>) => result.skills.find(skill => skill.skillId === 'planning')!;

describe('recall versus application', () => {
  it('counts a repeat of an already-seen scenario as recall, not application', () => {
    const skill = planning(buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'undefined-risk', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(2) },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(3) },
    ]));
    expect(skill.application.attempts).toBe(1);
    expect(skill.recall.attempts).toBe(2);
    expect(skill.recall.positiveDecisions).toBe(2);
    expect(skill.distinctScenarios).toBe(1);
  });

  it('counts a first attempt at a different scenario of the same skill as transfer', () => {
    const skill = planning(buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-004', outcome: 'undefined-risk', submitted_at: at(2) },
      { scenario_id: 'TQ-SYN-005', outcome: 'disciplined', submitted_at: at(3) },
    ]));
    expect(skill.application.attempts).toBe(3);
    expect(skill.application.transferAttempts).toBe(2);
    expect(skill.application.transferPositiveDecisions).toBe(1);
    expect(skill.recall.attempts).toBe(0);
  });

  it('orders by submission time even when the API returns newest first', () => {
    const skill = planning(buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(3) },
      { scenario_id: 'TQ-SYN-004', outcome: 'disciplined', submitted_at: at(2) },
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) },
    ]));
    expect(skill.application.attempts).toBe(2);
    expect(skill.recall.attempts).toBe(1);
  });

  it('does not let repeating one scenario build confidence', () => {
    const repeats = Array.from({ length: 8 }, (_, i) => ({ scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(i) }));
    const skill = planning(buildMastery(repeats));
    expect(skill.successRate).toBe(100);
    expect(skill.confidence).toBe('not-enough-evidence');
    expect(skill.recall.confidence).not.toBe('building');
  });

  it('stays cautious until evidence spans several scenarios', () => {
    const twoScenarios = planning(buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-004', outcome: 'disciplined', submitted_at: at(2) },
    ]));
    expect(twoScenarios.confidence).toBe('not-enough-evidence');
    const threeScenarios = planning(buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-004', outcome: 'disciplined', submitted_at: at(2) },
      { scenario_id: 'TQ-SYN-005', outcome: 'disciplined', submitted_at: at(3) },
    ]));
    expect(threeScenarios.confidence).toBe('early-signal');
    expect(threeScenarios.application.confidence).toBe('early-signal');
  });

  it('recommends an unseen variant of the weakest skill', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-002', outcome: 'risk-exceeded', submitted_at: at(2) },
      { scenario_id: 'TQ-SYN-003', outcome: 'evidence-led', submitted_at: at(3) },
    ]);
    expect(result.recommendation.skillId).toBe('risk-management');
    expect(['TQ-SYN-006', 'TQ-SYN-007']).toContain(result.recommendation.scenarioId);
    expect(result.recommendation.isNewScenario).toBe(true);
  });

  it('falls back to a seen scenario, and says so, when every variant has been seen', () => {
    const ids = ['TQ-SYN-001', 'TQ-SYN-004', 'TQ-SYN-005', 'TQ-SYN-002', 'TQ-SYN-006', 'TQ-SYN-007', 'TQ-SYN-003', 'TQ-SYN-008', 'TQ-SYN-009'];
    const result = buildMastery(ids.map((scenario_id, i) => ({ scenario_id, outcome: 'disciplined', submitted_at: at(i) })));
    expect(result.recommendation.isNewScenario).toBe(false);
    expect(result.recommendation.reason).toContain('recall');
  });

  it('ignores scenarios outside the catalogue and does not treat another skill\'s outcome as positive', () => {
    const result = buildMastery([
      { scenario_id: 'TQ-SYN-999', outcome: 'disciplined', submitted_at: at(1) },
      { scenario_id: 'TQ-SYN-001', outcome: 'risk-aware', submitted_at: at(2) },
    ]);
    expect(planning(result).attempts).toBe(1);
    expect(planning(result).positiveDecisions).toBe(0);
  });

  it('does not leak internal bookkeeping fields', () => {
    const result = buildMastery([{ scenario_id: 'TQ-SYN-001', outcome: 'disciplined', submitted_at: at(1) }]);
    expect(Object.keys(result.skills[0])).not.toContain('seenScenarioIds');
    expect(Object.keys(result.skills[0])).not.toContain('scenarioIds');
  });
});
