import { describe, expect, it } from 'vitest';
import { calculateRisk } from './risk';

describe('calculateRisk', () => {
  it('calculates risk budget and position units from the stop distance', () => {
    const result = calculateRisk({ equity: 10000, riskPercent: 1, entry: 2000, stop: 1990, unitsPerPrice: 1 });
    expect(result.riskBudget).toBe(100);
    expect(result.distance).toBe(10);
    expect(result.units).toBe(10);
    expect(result.estimatedLoss).toBe(100);
  });

  it('rejects identical entry and stop', () => {
    expect(() => calculateRisk({ equity: 1000, riskPercent: 1, entry: 100, stop: 100, unitsPerPrice: 1 })).toThrow();
  });

  it('rejects invalid risk percentages', () => {
    expect(() => calculateRisk({ equity: 1000, riskPercent: 101, entry: 100, stop: 90, unitsPerPrice: 1 })).toThrow();
  });
});

describe('calculateRewardRisk', () => {
  it('calculates a two-to-one reward/risk plan for a long example', async () => {
    const { calculateRewardRisk } = await import('./risk');
    expect(calculateRewardRisk({ entry: 100, stop: 90, target: 120 })).toEqual({ riskDistance: 10, rewardDistance: 20, ratio: 2 });
  });

  it('supports a short example with target below entry', async () => {
    const { calculateRewardRisk } = await import('./risk');
    expect(calculateRewardRisk({ entry: 100, stop: 110, target: 80 }).ratio).toBe(2);
  });

  it('rejects targets on the wrong side of the entry', async () => {
    const { calculateRewardRisk } = await import('./risk');
    expect(() => calculateRewardRisk({ entry: 100, stop: 90, target: 95 })).toThrow(/opposite the stop direction/);
    expect(() => calculateRewardRisk({ entry: 100, stop: 110, target: 105 })).toThrow(/opposite the stop direction/);
  });

  it('rejects equal entry/stop and non-positive or non-finite prices', async () => {
    const { calculateRewardRisk } = await import('./risk');
    expect(() => calculateRewardRisk({ entry: 100, stop: 100, target: 120 })).toThrow(/different/);
    expect(() => calculateRewardRisk({ entry: 0, stop: -1, target: 2 })).toThrow(/positive/);
    expect(() => calculateRewardRisk({ entry: Number.NaN, stop: 90, target: 120 })).toThrow(/numeric/);
  });
});
