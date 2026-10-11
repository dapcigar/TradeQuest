import { z } from 'zod';

export const progressEventSchema = z.object({
  eventId: z.string().uuid(),
  eventKey: z.enum([
    'foundations-lesson-01',
    'risk-tool-used-v1',
    'chart-dojo-scenario-01',
  ]),
}).strict();

export const chartDojoAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  scenarioId: z.literal('TQ-SYN-001'),
  choiceId: z.enum(['wait', 'buy', 'skip']),
}).strict();

export const attemptSchema = z.object({
  lessonId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  lessonVersion: z.string().min(1).max(40),
  attemptId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().min(1).max(80),
    answerId: z.string().min(1).max(80),
  }).strict()).min(1).max(50),
}).strict();
