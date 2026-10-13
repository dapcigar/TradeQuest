import { describe, expect, it } from 'vitest';
import { attemptSchema, communityChallengeEntrySchema, communityChallengeProposalSchema, communityReportSchema, communityModerationActionSchema, communityEditorialReviewSchema, communityProfileSchema, chartDojoAttemptSchema, deleteLearningDataSchema, progressEventSchema, paperTradePlanSchema, weeklyPracticePlanQuerySchema, weeklyPracticeSessionSchema, weeklyPracticeTargetSchema } from './schemas.js';

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


describe('community challenge schemas', () => {
  const validEntry = {
    challengeId: 'QUEST-001',
    attemptId: '0e7a6c7c-95c6-4d47-9e92-9c3ddf5c0a1e',
    reflection: 'I waited for evidence and defined what would invalidate the idea.',
    isPublic: false,
  };

  it('accepts bounded process reflections and explicit visibility', () => {
    expect(communityChallengeEntrySchema.safeParse(validEntry).success).toBe(true);
  });

  it('rejects malformed challenge IDs, invalid attempt IDs, short reflections, and caller-supplied scores', () => {
    expect(communityChallengeEntrySchema.safeParse({ ...validEntry, challengeId: 'NOT-A-QUEST' }).success).toBe(false);
    expect(communityChallengeEntrySchema.safeParse({ ...validEntry, attemptId: 'bad' }).success).toBe(false);
    expect(communityChallengeEntrySchema.safeParse({ ...validEntry, reflection: 'Too short' }).success).toBe(false);
    expect(communityChallengeEntrySchema.safeParse({ ...validEntry, rubricMet: true, outcome: 'evidence-led' }).success).toBe(false);
  });

  it('accepts bounded challenge proposals and rejects malformed or client-scored input', () => {
    const proposal = {
      scenarioId: 'TQ-SYN-001',
      title: 'Wait for evidence',
      description: 'A short synthetic scenario proposal with a clear decision point.',
      rubric: 'Reward defined evidence and a stated invalidation level before any decision.',
      positiveOutcome: 'disciplined',
      estimatedMinutes: 8,
    };
    expect(communityChallengeProposalSchema.safeParse(proposal).success).toBe(true);
    expect(communityChallengeProposalSchema.safeParse({ ...proposal, scenarioId: 'XAUUSD' }).success).toBe(false);
    expect(communityChallengeProposalSchema.safeParse({ ...proposal, title: 'x' }).success).toBe(false);
    expect(communityChallengeProposalSchema.safeParse({ ...proposal, estimatedMinutes: 121 }).success).toBe(false);
    expect(communityChallengeProposalSchema.safeParse({ ...proposal, score: 100 }).success).toBe(false);
  });

  it('allowlists report categories and moderator actions with bounded reasons', () => {
    expect(communityReportSchema.safeParse({ category: 'unsafe-advice', details: '' }).success).toBe(true);
    expect(communityReportSchema.safeParse({ category: 'unwanted', details: '' }).success).toBe(false);
    expect(communityModerationActionSchema.safeParse({ action: 'hide', reason: 'Contains personal information.' }).success).toBe(true);
    expect(communityModerationActionSchema.safeParse({ action: 'publish', reason: 'Looks fine' }).success).toBe(false);
    expect(communityModerationActionSchema.safeParse({ action: 'hide', reason: 'x' }).success).toBe(false);
  });
});


describe('community editorial review schema', () => {
  it('accepts only explicit decisions with a bounded reason', () => {
    expect(communityEditorialReviewSchema.safeParse({ decision: 'approve', reason: 'Reviewed against the approved process rubric.' }).success).toBe(true);
    expect(communityEditorialReviewSchema.safeParse({ decision: 'revision-needed', reason: 'Clarify the invalidation example.' }).success).toBe(true);
    expect(communityEditorialReviewSchema.safeParse({ decision: 'publish', reason: 'Looks good' }).success).toBe(false);
    expect(communityEditorialReviewSchema.safeParse({ decision: 'retire', reason: 'x' }).success).toBe(false);
  });

  it('rejects caller-supplied reviewer identities or content publication flags', () => {
    expect(communityEditorialReviewSchema.safeParse({ decision: 'approve', reason: 'Reviewed content.', reviewerId: 'attacker' }).success).toBe(false);
    expect(communityEditorialReviewSchema.safeParse({ decision: 'approve', reason: 'Reviewed content.', published: true }).success).toBe(false);
  });
});


describe('paperTradePlanSchema execution assumptions', () => {
  const base = { direction: 'long', entry: 103, stop: 98, target: 108, equity: 10000, riskPercent: 1 };

  it('defaults to an explicitly generic fictional price-unit model', () => {
    expect(paperTradePlanSchema.parse(base)).toMatchObject({
      instrumentLabel: 'Generic price-unit model', tickSize: 1, tickValue: 1, contractSize: 1,
      lotStep: 0.01, spreadTicks: 0, commissionPerUnit: 0, slippageTicks: 0, leverage: 1,
    });
  });

  it('accepts bounded user-defined tick, cost, lot and margin assumptions', () => {
    expect(paperTradePlanSchema.parse({
      ...base, instrumentLabel: 'Training model', tickSize: 0.5, tickValue: 2,
      contractSize: 10, lotStep: 0.1, spreadTicks: 1, commissionPerUnit: 0.5,
      slippageTicks: 0.25, leverage: 10,
    }).tickSize).toBe(0.5);
  });

  it('rejects invalid costs, lot steps, leverage, and unknown fields', () => {
    expect(paperTradePlanSchema.safeParse({ ...base, spreadTicks: -1 }).success).toBe(false);
    expect(paperTradePlanSchema.safeParse({ ...base, tickSize: 0 }).success).toBe(false);
    expect(paperTradePlanSchema.safeParse({ ...base, lotStep: 0 }).success).toBe(false);
    expect(paperTradePlanSchema.safeParse({ ...base, leverage: 1001 }).success).toBe(false);
    expect(paperTradePlanSchema.safeParse({ ...base, realBroker: true }).success).toBe(false);
  });
});
