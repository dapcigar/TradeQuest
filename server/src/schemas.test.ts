import { describe, expect, it } from 'vitest';
import { attemptSchema, communityProfileSchema, chartDojoAttemptSchema, deleteLearningDataSchema, progressEventSchema, weeklyPracticePlanQuerySchema, weeklyPracticeSessionSchema, weeklyPracticeTargetSchema } from './schemas.js';

describe('progressEventSchema', () => {
  const valid = {
    eventId: '0e7a6c7c-95c6-4d47-9e92-9c3ddf5c0a1e',
    eventKey: 'risk-tool-used-v1',
  };

  it('accepts an allowlisted event with a UUID', () => {
    expect(progressEventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects arbitrary event keys and client-supplied XP', () => {
    expect(progressEventSchema.safeParse({ ...valid, eventKey: 'award-9999-xp' }).success).toBe(false);
    expect(progressEventSchema.safeParse({ ...valid, xp: 9999 }).success).toBe(false);
  });

  it('rejects the Chart Dojo milestone, which is only earned by submitting an attempt', () => {
    expect(progressEventSchema.safeParse({ ...valid, eventKey: 'chart-dojo-scenario-01' }).success).toBe(false);
  });

  it('rejects malformed IDs', () => {
    expect(progressEventSchema.safeParse({ ...valid, eventId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('chartDojoAttemptSchema', () => {
  const valid = {
    attemptId: '0e7a6c7c-95c6-4d47-9e92-9c3ddf5c0a1e',
    scenarioId: 'TQ-SYN-001',
    choiceId: 'wait',
  };

  it('accepts the versioned scenario identifier format and choice slugs', () => {
    expect(chartDojoAttemptSchema.safeParse(valid).success).toBe(true);
    expect(chartDojoAttemptSchema.safeParse({ ...valid, scenarioId: 'TQ-SYN-002', choiceId: 'recalculate' }).success).toBe(true);
  });

  it('rejects malformed scenario identifiers, choices, and extra fields', () => {
    expect(chartDojoAttemptSchema.safeParse({ ...valid, scenarioId: 'live-gold' }).success).toBe(false);
    expect(chartDojoAttemptSchema.safeParse({ ...valid, choiceId: 'not a choice' }).success).toBe(false);
    expect(chartDojoAttemptSchema.safeParse({ ...valid, userId: 'attacker-chosen-id' }).success).toBe(false);
  });

  it('requires a UUID attempt ID', () => {
    expect(chartDojoAttemptSchema.safeParse({ ...valid, attemptId: 'attempt-1' }).success).toBe(false);
  });
});

describe('attemptSchema', () => {
  const valid = {
    lessonId: 'spread-basics',
    lessonVersion: '1',
    attemptId: '0e7a6c7c-95c6-4d47-9e92-9c3ddf5c0a1e',
    answers: [{ questionId: 'q1', answerId: 'spread' }],
  };

  it('accepts a well-formed lesson attempt', () => {
    expect(attemptSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty, excessive, or malformed answers', () => {
    expect(attemptSchema.safeParse({ ...valid, answers: [] }).success).toBe(false);
    expect(attemptSchema.safeParse({ ...valid, answers: Array.from({ length: 51 }, () => valid.answers[0]) }).success).toBe(false);
    expect(attemptSchema.safeParse({ ...valid, answers: [{ questionId: '', answerId: 'x' }] }).success).toBe(false);
  });

  it('rejects unexpected top-level and answer fields', () => {
    expect(attemptSchema.safeParse({ ...valid, userId: 'attacker-chosen-id' }).success).toBe(false);
    expect(attemptSchema.safeParse({ ...valid, answers: [{ ...valid.answers[0], correct: true }] }).success).toBe(false);
  });
});

describe('decisionJournalSchema', () => {
  const valid = { title: 'Waited for evidence', decision: 'waited', thesis: 'The level was unclear.', invalidation: 'A close below the level.', riskPlan: 'Pass if the loss exceeds the budget.', reflection: '', lessonLearned: 'Write the invalidation first.', scenarioId: 'TQ-SYN-001' };
  it('accepts a bounded journal reflection', async () => {
    const { decisionJournalSchema } = await import('./schemas.js');
    expect(decisionJournalSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects user IDs, unknown decisions, invalid scenarios, and oversized notes', async () => {
    const { decisionJournalSchema } = await import('./schemas.js');
    expect(decisionJournalSchema.safeParse({ ...valid, userId: 'another-user' }).success).toBe(false);
    expect(decisionJournalSchema.safeParse({ ...valid, decision: 'buy' }).success).toBe(false);
    expect(decisionJournalSchema.safeParse({ ...valid, scenarioId: 'live-gold' }).success).toBe(false);
    expect(decisionJournalSchema.safeParse({ ...valid, thesis: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('deleteLearningDataSchema', () => {
  it('requires the explicit confirmation phrase and rejects extra fields', () => {
    expect(deleteLearningDataSchema.safeParse({ confirmation: 'DELETE_MY_LEARNING_DATA' }).success).toBe(true);
    expect(deleteLearningDataSchema.safeParse({ confirmation: 'delete' }).success).toBe(false);
    expect(deleteLearningDataSchema.safeParse({ confirmation: 'DELETE_MY_LEARNING_DATA', userId: 'another-user' }).success).toBe(false);
    expect(deleteLearningDataSchema.safeParse({}).success).toBe(false);
  });
});

describe('weekly practice plan schemas', () => {
  it('accepts a valid Monday, supported target, and date in ISO format', () => {
    expect(weeklyPracticePlanQuerySchema.safeParse({ weekStart: '2026-10-12' }).success).toBe(true);
    expect(weeklyPracticeTargetSchema.safeParse({ weekStart: '2026-10-12', target: 5 }).success).toBe(true);
    expect(weeklyPracticeSessionSchema.safeParse({ weekStart: '2026-10-12', sessionDate: '2026-10-14', completed: true }).success).toBe(true);
  });

  it('rejects non-Mondays, invalid calendar dates, unsupported targets, and extra fields', () => {
    expect(weeklyPracticePlanQuerySchema.safeParse({ weekStart: '2026-10-13' }).success).toBe(false);
    expect(weeklyPracticePlanQuerySchema.safeParse({ weekStart: '2026-02-30' }).success).toBe(false);
    expect(weeklyPracticeTargetSchema.safeParse({ weekStart: '2026-10-12', target: 4 }).success).toBe(false);
    expect(weeklyPracticeTargetSchema.safeParse({ weekStart: '2026-10-12', target: 3, userId: 'other' }).success).toBe(false);
  });
});


describe('communityProfileSchema', () => {
  const valid = { handle: 'learner_01', displayName: 'Curious Learner', bio: 'Learning the process.', isPublic: false };

  it('accepts a private profile with a constrained public identity', () => {
    expect(communityProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects uppercase, short, long, or unsafe handles and oversized profile fields', () => {
    expect(communityProfileSchema.safeParse({ ...valid, handle: 'UpperCase' }).success).toBe(false);
    expect(communityProfileSchema.safeParse({ ...valid, handle: 'ab' }).success).toBe(false);
    expect(communityProfileSchema.safeParse({ ...valid, handle: 'learner.name' }).success).toBe(false);
    expect(communityProfileSchema.safeParse({ ...valid, displayName: 'x' }).success).toBe(false);
    expect(communityProfileSchema.safeParse({ ...valid, bio: 'x'.repeat(281) }).success).toBe(false);
  });

  it('rejects caller-supplied ownership fields and requires explicit visibility', () => {
    expect(communityProfileSchema.safeParse({ ...valid, userId: 'attacker' }).success).toBe(false);
    const { isPublic: _visibility, ...withoutVisibility } = valid;
    expect(communityProfileSchema.safeParse(withoutVisibility).success).toBe(false);
  });
});
