import { describe, expect, it } from 'vitest';
import { assessStructureAnswer, structureQuestions } from './supportResistance';

describe('support and resistance literacy', () => {
  it('covers zones, repeated reactions, and uncertain breakouts', () => {
    expect(structureQuestions.map(question => question.id)).toEqual(['zones', 'touches', 'breakout']);
    expect(structureQuestions.every(question => question.options.some(option => option.id === question.correctOptionId))).toBe(true);
  });

  it('explains why zones are not guaranteed turning points', () => {
    expect(assessStructureAnswer('zones', 'zones')).toEqual({
      correct: true,
      explanation: expect.stringContaining('not precise barriers'),
    });
  });

  it('rejects certainty about repeated reactions and breakouts', () => {
    expect(assessStructureAnswer('touches', 'certain')?.correct).toBe(false);
    expect(assessStructureAnswer('breakout', 'guaranteed')?.explanation).toContain('can fail or continue');
  });

  it('rejects unknown questions and options', () => {
    expect(assessStructureAnswer('unknown', 'zones')).toBeNull();
    expect(assessStructureAnswer('zones', 'unknown')).toBeNull();
  });
});
