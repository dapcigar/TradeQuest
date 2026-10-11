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