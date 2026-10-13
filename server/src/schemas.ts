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


export const paperTradePlanSchema = z.object({
  direction: z.enum(['long', 'short']),
  entry: z.number().finite().min(0.000001).max(1_000_000_000),
  stop: z.number().finite().min(0.000001).max(1_000_000_000),
  target: z.number().finite().min(0.000001).max(1_000_000_000),
  equity: z.number().finite().positive().max(1_000_000_000),
  riskPercent: z.number().finite().min(0.01).max(5),
  instrumentLabel: z.string().trim().min(2).max(40).default('Generic price-unit model'),
  tickSize: z.number().finite().min(0.000001).max(1_000_000).default(1),
  tickValue: z.number().finite().min(0.000001).max(1_000_000).default(1),
  contractSize: z.number().finite().min(0.000001).max(1_000_000).default(1),
  lotStep: z.number().finite().min(0.000001).max(1_000_000).default(0.01),
  spreadTicks: z.number().finite().min(0).max(1000).default(0),
  commissionPerUnit: z.number().finite().min(0).max(1_000_000).default(0),
  slippageTicks: z.number().finite().min(0).max(1000).default(0),
  leverage: z.number().finite().min(1).max(1000).default(1),
}).strict();

export const paperTradeStepSchema = z.object({ sessionId: z.string().uuid(), expectedVersion: z.number().int().nonnegative() }).strict();


export const deleteLearningDataSchema = z.object({
  confirmation: z.literal('DELETE_MY_LEARNING_DATA'),
}).strict();


const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const mondayDateSchema = isoDateSchema.refine(value => new Date(value + 'T00:00:00.000Z').getUTCDay() === 1);

export const weeklyPracticePlanQuerySchema = z.object({
  weekStart: mondayDateSchema,
}).strict();

export const weeklyPracticeTargetSchema = z.object({
  weekStart: mondayDateSchema,
  target: z.union([z.literal(3), z.literal(5), z.literal(7)]),
}).strict();

export const weeklyPracticeSessionSchema = z.object({
  weekStart: mondayDateSchema,
  sessionDate: isoDateSchema,
  completed: z.boolean(),
}).strict();

export const communityProfileSchema = z.object({
  handle: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{2,19}$/, 'Use 3–20 lowercase letters, numbers, underscores, or hyphens.'),
  displayName: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(280).default(''),
  isPublic: z.boolean(),
}).strict();


export const communityChallengeEntrySchema = z.object({
  challengeId: z.string().regex(/^QUEST-[0-9]{3}$/),
  attemptId: z.string().uuid(),
  reflection: z.string().trim().min(10).max(1000),
  isPublic: z.boolean(),
}).strict();

export const communityChallengeProposalSchema = z.object({
  scenarioId: z.string().regex(/^TQ-SYN-[0-9]{3}$/),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  rubric: z.string().trim().min(10).max(1000),
  estimatedMinutes: z.number().int().min(1).max(120),
}).strict();

export const communityReportSchema = z.object({
  category: z.enum(['spam', 'harassment', 'personal-information', 'unsafe-advice', 'copyright', 'other']),
  details: z.string().trim().max(1000).default(''),
}).strict();

export const communityModerationActionSchema = z.object({
  action: z.enum(['approve', 'hide', 'remove']),
  reason: z.string().trim().min(3).max(500),
}).strict();


export const communityEditorialReviewSchema = z.object({
  decision: z.enum(['approve', 'revision-needed', 'retire']),
  reason: z.string().trim().min(3).max(500),
}).strict();
