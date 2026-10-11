import { z } from 'zod';

export const progressEventSchema = z.object({
  eventId: z.string().uuid(),
  eventKey: z.enum([
    'foundations-lesson-01',
    'risk-tool-used-v1',
  ]),
}).strict();

export const chartDojoAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  scenarioId: z.string().regex(/^TQ-SYN-[0-9]{3}$/),
  choiceId: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
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


export const decisionJournalSchema = z.object({
  title: z.string().trim().min(1).max(120),
  scenarioId: z.string().regex(/^TQ-SYN-[0-9]{3}$/).nullable().optional(),
  decision: z.enum(['considered', 'waited', 'passed', 'simulated']),
  thesis: z.string().max(2000).optional().default(''),
  invalidation: z.string().max(1000).optional().default(''),
  riskPlan: z.string().max(1000).optional().default(''),
  reflection: z.string().max(2000).optional().default(''),
  lessonLearned: z.string().max(1000).optional().default(''),
}).strict();

export const decisionJournalPatchSchema = decisionJournalSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'At least one field is required.' },
);
