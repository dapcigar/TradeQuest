import { describe, expect, it } from 'vitest';
import { assessPositionSizingAnswer, positionSizingQuestions } from './positionSizingLiteracy';

describe('position sizing literacy', () => {
  it('covers risk budget, stop distance, and instrument specifications', () => {
    expect(positionSizingQuestions.map(question => question.id)).toEqual(['budget-first', 'stop-distance', 'instrument-spec']);
    expect(positionSizingQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('uses the risk budget before choosing a position', () => {
    expect(assessPositionSizingAnswer('budget-first', '20')?.correct).toBe(true);
    expect(assessPositionSizingAnswer('budget-first', '200')?.correct).toBe(false);
  });

  it('explains why wider stops usually require smaller positions', () => {
    expect(assessPositionSizingAnswer('stop-distance', 'smaller')?.correct).toBe(true);
    expect(assessPositionSizingAnswer('stop-distance', 'larger')?.correct).toBe(false);
  });

  it('does not guess missing instrument specifications or accept unknown inputs', () => {
    expect(assessPositionSizingAnswer('instrument-spec', 'verify')?.correct).toBe(true);
    expect(assessPositionSizingAnswer('instrument-spec', 'guess')?.correct).toBe(false);
    expect(assessPositionSizingAnswer('missing', 'verify')).toBeNull();
    expect(assessPositionSizingAnswer('budget-first', 'missing')).toBeNull();
  });
});
