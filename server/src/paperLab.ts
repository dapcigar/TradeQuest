import { createHmac, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import type { paperTradePlanSchema } from './schemas.js';

export type PaperTradePlan = z.infer<typeof paperTradePlanSchema>;
export type PaperCandle = { index: number; open: number; high: number; low: number; close: number };
const candles: PaperCandle[] = [
  { index: 0, open: 100, high: 104, low: 98, close: 103 },
  { index: 1, open: 103, high: 106, low: 101, close: 102 },
  { index: 2, open: 102, high: 105, low: 99, close: 100 },
  { index: 3, open: 100, high: 103, low: 97, close: 102 },
  { index: 4, open: 102, high: 108, low: 101, close: 107 },
  { index: 5, open: 107, high: 109, low: 103, close: 104 },
  { index: 6, open: 104, high: 106, low: 100, close: 101 },
  { index: 7, open: 101, high: 105, low: 99, close: 104 },
  { index: 8, open: 104, high: 110, low: 103, close: 109 },
  { index: 9, open: 109, high: 112, low: 106, close: 107 },
  { index: 10, open: 107, high: 108, low: 102, close: 103 },
  { index: 11, open: 103, high: 107, low: 101, close: 106 },
];
type ExitReason = 'stop' | 'target' | 'ambiguous-stop-first' | 'sequence-end';
type PaperState = { version: 1; scenarioId: 'synthetic-paper-basics'; learnerId: string; nextIndex: number; plan: PaperTradePlan; units: number; riskBudget: number };
function sign(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('base64url'); }
function issueToken(state: PaperState, secret: string) { const payload = Buffer.from(JSON.stringify(state)).toString('base64url'); return payload + '.' + sign(payload, secret); }
function readToken(token: string, secret: string, learnerId: string): PaperState | null {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = Buffer.from(sign(parts[0], secret)); const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const state = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Partial<PaperState>;
    if (state.version !== 1 || state.scenarioId !== 'synthetic-paper-basics' || state.learnerId !== learnerId || !Number.isInteger(state.nextIndex) || typeof state.nextIndex !== 'number' || state.nextIndex < 1 || state.nextIndex >= candles.length || !state.plan || !Number.isFinite(state.units) || typeof state.units !== 'number' || state.units <= 0 || !Number.isFinite(state.riskBudget) || typeof state.riskBudget !== 'number') return null;
    return state as PaperState;
  } catch { return null; }
}
function validatePlan(plan: PaperTradePlan) {
  if (plan.entry === plan.stop) throw new Error('Entry and stop must be different.');
  if (plan.entry === plan.target) throw new Error('Target must be beyond entry.');
  if (plan.direction === 'long' && !(plan.stop < plan.entry && plan.target > plan.entry)) throw new Error('For a long plan, stop must be below entry and target above entry.');
  if (plan.direction === 'short' && !(plan.stop > plan.entry && plan.target < plan.entry)) throw new Error('For a short plan, stop must be above entry and target below entry.');
}
function view(state: PaperState, candle: PaperCandle, secret: string, outcome: { exitPrice: number; reason: ExitReason; pnl: number } | null) {
  const complete = outcome !== null;
  return {
    scenarioId: state.scenarioId,
    label: 'Synthetic paper trade · fictional units',
    candle,
    totalCandles: candles.length,
    complete,
    nextToken: !complete && state.nextIndex < candles.length ? issueToken(state, secret) : null,
    position: { direction: state.plan.direction, entry: state.plan.entry, stop: state.plan.stop, target: state.plan.target, units: state.units, riskBudget: state.riskBudget, virtualEquity: state.plan.equity },
    outcome: outcome ? { ...outcome, virtualEquityAfter: state.plan.equity + outcome.pnl } : null,
    policy: 'If stop and target are both touched within one candle, stop is assumed first. Adverse gaps fill at the candle open. Costs, spread and slippage are otherwise excluded.',
  };
}
export function startPaperTrade(input: { plan: PaperTradePlan; secret: string; learnerId: string }) {
  if (!input.secret || input.secret.length < 32) throw new Error('Paper trade signing secret is not configured securely.');
  validatePlan(input.plan);
  const riskBudget = input.plan.equity * input.plan.riskPercent / 100;
  const units = riskBudget / Math.abs(input.plan.entry - input.plan.stop);
  const state: PaperState = { version: 1, scenarioId: 'synthetic-paper-basics', learnerId: input.learnerId, nextIndex: 1, plan: input.plan, units, riskBudget };
  return view(state, candles[0], input.secret, null);
}
export function advancePaperTrade(input: { token: string; secret: string; learnerId: string }) {
  if (!input.secret || input.secret.length < 32) throw new Error('Paper trade signing secret is not configured securely.');
  const state = readToken(input.token, input.secret, input.learnerId);
  if (!state) throw new Error('Paper trade session is invalid or belongs to another learner.');
  const candle = candles[state.nextIndex];
  const long = state.plan.direction === 'long';
  const hitStop = long ? candle.low <= state.plan.stop : candle.high >= state.plan.stop;
  const hitTarget = long ? candle.high >= state.plan.target : candle.low <= state.plan.target;
  let outcome: { exitPrice: number; reason: ExitReason; pnl: number } | null = null;
  if (hitStop && hitTarget) {
    const exitPrice = long ? Math.min(state.plan.stop, candle.open) : Math.max(state.plan.stop, candle.open);
    outcome = { exitPrice, reason: 'ambiguous-stop-first', pnl: (exitPrice - state.plan.entry) * state.units * (long ? 1 : -1) };
  } else if (hitStop) {
    const exitPrice = long ? Math.min(state.plan.stop, candle.open) : Math.max(state.plan.stop, candle.open);
    outcome = { exitPrice, reason: 'stop', pnl: (exitPrice - state.plan.entry) * state.units * (long ? 1 : -1) };
  } else if (hitTarget) {
    const exitPrice = state.plan.target;
    outcome = { exitPrice, reason: 'target', pnl: (exitPrice - state.plan.entry) * state.units * (long ? 1 : -1) };
  } else if (state.nextIndex === candles.length - 1) {
    const exitPrice = candle.close;
    outcome = { exitPrice, reason: 'sequence-end', pnl: (exitPrice - state.plan.entry) * state.units * (long ? 1 : -1) };
  }
  const nextState: PaperState = { ...state, nextIndex: state.nextIndex + 1 };
  return view(nextState, candle, input.secret, outcome);
}
