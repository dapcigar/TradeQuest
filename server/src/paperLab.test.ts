import { describe, expect, it } from 'vitest';
import { advancePaperTrade, startPaperTrade } from './paperLab.js';
import type { PaperTradePlan } from './paperLab.js';
const secret = 'paper-lab-test-secret-that-is-at-least-32-chars';
const longPlan: PaperTradePlan = { direction: 'long', entry: 103, stop: 98, target: 108, equity: 10000, riskPercent: 1 };

describe('synthetic paper trade lab', () => {
  it('returns only the first candle and derives size from the risk budget', () => {
    const result = startPaperTrade({ plan: longPlan, secret, learnerId: 'learner-a' });
    expect(result.candle.index).toBe(0);
    expect(result).not.toHaveProperty('candles');
    expect(result.position.riskBudget).toBe(100);
    expect(result.position.units).toBe(20);
    expect(result.nextToken).toBeTruthy();
  });
  it('reveals one candle per step and closes at the target when first reached', () => {
    let result = startPaperTrade({ plan: { ...longPlan, stop: 95, target: 105 }, secret, learnerId: 'learner-a' });
    result = advancePaperTrade({ token: result.nextToken!, secret, learnerId: 'learner-a' });
    expect(result.candle.index).toBe(1);
    result = advancePaperTrade({ token: result.nextToken!, secret, learnerId: 'learner-a' });
    expect(result.candle.index).toBe(2);
    expect(result.complete).toBe(true);
    expect(result.outcome?.reason).toBe('target');
  });
  it('rejects tokens from another learner and tampered tokens', () => {
    const started = startPaperTrade({ plan: longPlan, secret, learnerId: 'learner-a' });
    expect(() => advancePaperTrade({ token: started.nextToken!, secret, learnerId: 'learner-b' })).toThrow(/invalid or belongs/);
    expect(() => advancePaperTrade({ token: started.nextToken!.replace(/.$/, 'x'), secret, learnerId: 'learner-a' })).toThrow(/invalid or belongs/);
  });
  it('rejects unsafe directional plans and weak secrets', () => {
    expect(() => startPaperTrade({ plan: { ...longPlan, target: 100 }, secret, learnerId: 'learner-a' })).toThrow(/target above entry/);
    expect(() => startPaperTrade({ plan: longPlan, secret: 'weak', learnerId: 'learner-a' })).toThrow(/not configured securely/);
  });
  it('uses the conservative stop-first rule when stop and target share a candle', () => {
    let result = startPaperTrade({ plan: { ...longPlan, stop: 102, target: 105 }, secret, learnerId: 'learner-a' });
    result = advancePaperTrade({ token: result.nextToken!, secret, learnerId: 'learner-a' });
    result = advancePaperTrade({ token: result.nextToken!, secret, learnerId: 'learner-a' });
    expect(result.complete).toBe(true);
    expect(result.outcome?.reason).toBe('ambiguous-stop-first');
    expect(result.outcome?.pnl).toBeLessThan(0);
  });
});
