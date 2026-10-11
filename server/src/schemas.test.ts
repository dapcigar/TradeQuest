import { describe, expect, it } from 'vitest';
import { attemptSchema, chartDojoAttemptSchema, progressEventSchema } from './schemas.js';

describe('progressEventSchema', () => {
  const valid = {
    eventId: '0e7a6c7c-95c6-4d47-9e92-9c3ddf5c0a1e',
    eventKey: 'chart-dojo-scenario-01',
  };

  it('accepts an allowlisted event with a UUID', () => {
    expect(progressEventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects arbitrary event keys and client-supplied XP', () => {
    expect(progressEventSchema.safeParse({ ...valid, eventKey: 'award-9999-xp' }).success).toBe(false);
    expect(progressEventSchema.safeParse({ ...valid, xp: 9999 }).success).toBe(false);
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

  it('accepts each supported choice', () => {
    for (const choiceId of ['wait', 'buy', 'skip']) {
      expect(chartDojoAttemptSchema.safeParse({ ...valid, choiceId }).success).toBe(true);
    }
  });

  it('rejects unknown scenarios, choices, and extra fields', () => {
    expect(chartDojoAttemptSchema.safeParse({ ...valid, scenarioId: 'live-gold' }).success).toBe(false);
    expect(chartDojoAttemptSchema.safeParse({ ...valid, choiceId: 'short' }).success).toBe(false);
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
