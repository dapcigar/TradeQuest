export type MasteryAttempt = { scenario_id: string; outcome: string; submitted_at?: string };
export type LessonMasteryAttempt = { lesson_id: string; score: number; passed: boolean; submitted_at?: string };
export type RiskPracticeEvent = { event_key: string; recorded_at?: string };

const REVIEW_AFTER_DAYS = 14;
const REVIEW_AFTER_MS = REVIEW_AFTER_DAYS * 24 * 60 * 60 * 1000;

const SKILLS = [
  { scenarioId: 'TQ-SYN-001', skillId: 'planning', label: 'Plan before entry', description: 'Define a reason to enter and what would invalidate the idea.' },
  { scenarioId: 'TQ-SYN-002', skillId: 'risk-management', label: 'Keep risk within budget', description: 'Size a position so a possible loss fits the stated risk budget.' },
  { scenarioId: 'TQ-SYN-003', skillId: 'evidence', label: 'Wait for evidence', description: 'Distinguish observable evidence from prediction or impulse.' },
] as const;

const POSITIVE_OUTCOMES: Record<string, string[]> = {
  'TQ-SYN-001': ['disciplined'],
  'TQ-SYN-002': ['risk-aware'],
  'TQ-SYN-003': ['evidence-led'],
};

function validTimestamp(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildMastery(
  attempts: MasteryAttempt[],
  lessonAttempts: LessonMasteryAttempt[] = [],
  progressEvents: RiskPracticeEvent[] = [],
  now: Date = new Date(),
) {
  const reviewCutoff = now.getTime() - REVIEW_AFTER_MS;
  const skills = SKILLS.map(skill => {
    const relevant = attempts.filter(attempt => attempt.scenario_id === skill.scenarioId);
    const chronological = relevant
      .map(attempt => ({ ...attempt, timestamp: validTimestamp(attempt.submitted_at) }))
      .filter((attempt): attempt is MasteryAttempt & { timestamp: number } => attempt.timestamp !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
    const positive = relevant.filter(attempt => POSITIVE_OUTCOMES[skill.scenarioId].includes(attempt.outcome)).length;
    const count = relevant.length;
    const timestamps = chronological.map(attempt => attempt.timestamp);
    const lastPractisedMs = timestamps.length ? Math.max(...timestamps) : null;
    const lastPractisedAt = lastPractisedMs === null ? null : new Date(lastPractisedMs).toISOString();
    const reviewStatus = count === 0 ? 'not-yet-practised'
      : lastPractisedMs === null ? 'date-unavailable'
        : lastPractisedMs <= reviewCutoff ? 'review-due' : 'recently-practised';

    const firstAttempt = chronological[0];
    const firstAttemptPositive = firstAttempt
      ? POSITIVE_OUTCOMES[skill.scenarioId].includes(firstAttempt.outcome)
      : null;
    const delayedReviews = chronological.filter((attempt, index) =>
      index > 0 && attempt.timestamp - chronological[index - 1].timestamp >= REVIEW_AFTER_MS,
    );
    const retainedAfterReview = delayedReviews.some(attempt =>
      POSITIVE_OUTCOMES[skill.scenarioId].includes(attempt.outcome),
    );
    const retentionStatus = count === 0 ? 'not-yet-practised'
      : !firstAttempt ? 'date-unavailable'
        : delayedReviews.length === 0 ? 'awaiting-delayed-review'
          : retainedAfterReview ? 'retained-after-review' : 'needs-reinforcement';
    // Repetition alone is not mastery: the stronger signal requires a positive
    // decision after a meaningful gap, plus at least one other positive decision.
    const confidence = retainedAfterReview && positive >= 2 ? 'building'
      : count >= 3 ? 'early-signal' : 'not-enough-evidence';

    return {
      skillId: skill.skillId, scenarioId: skill.scenarioId, label: skill.label,
      description: skill.description, attempts: count, positiveDecisions: positive,
      successRate: count ? Math.round((positive / count) * 100) : null,
      confidence,
      lastPractisedAt,
      reviewStatus,
      firstAttemptPositive,
      delayedReviewAttempts: delayedReviews.length,
      retentionStatus,
    };
  });
  const dueSkills = skills.filter(skill => skill.reviewStatus === 'review-due');
  const pool = dueSkills.length ? dueSkills : skills;
  const recommended = [...pool].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    if (a.successRate === null && b.successRate !== null) return -1;
    if (b.successRate === null && a.successRate !== null) return 1;
    return (a.successRate ?? 0) - (b.successRate ?? 0);
  })[0];
  const reason = recommended.reviewStatus === 'review-due'
    ? 'Revisit this skill: your last recorded practice was at least 14 days ago.'
    : recommended.retentionStatus === 'needs-reinforcement'
      ? 'Revisit this skill: your delayed review suggests there is more to reinforce.'
      : recommended.retentionStatus === 'awaiting-delayed-review'
        ? 'Return after a gap to check whether the idea sticks—not just whether it worked once.'
        : recommended.attempts === 0 ? 'Start here: you have not practised this skill yet.'
          : recommended.confidence === 'not-enough-evidence' ? 'Build a little more evidence with another practice attempt.'
            : 'This skill is your best next practice target based on your practice history.';
  return {
    skills,
    recommendation: {
      scenarioId: recommended.scenarioId, skillId: recommended.skillId, title: recommended.label,
      reason, attempts: recommended.attempts, confidence: recommended.confidence,
      reviewStatus: recommended.reviewStatus,
      retentionStatus: recommended.retentionStatus,
    },
    learningSignals: [
      {
        signalId: 'spread-basics',
        label: 'Trading mechanics · spread basics',
        description: 'Server-scored knowledge checks for bid, ask, and spread.',
        attempts: lessonAttempts.filter(item => item.lesson_id === 'spread-basics').length,
        positiveDecisions: lessonAttempts.filter(item => item.lesson_id === 'spread-basics' && item.passed).length,
        successRate: lessonAttempts.filter(item => item.lesson_id === 'spread-basics').length
          ? Math.round(lessonAttempts.filter(item => item.lesson_id === 'spread-basics' && item.passed).length / lessonAttempts.filter(item => item.lesson_id === 'spread-basics').length * 100)
          : null,
        confidence: lessonAttempts.filter(item => item.lesson_id === 'spread-basics').length >= 5 ? 'building'
          : lessonAttempts.filter(item => item.lesson_id === 'spread-basics').length >= 3 ? 'early-signal' : 'not-enough-evidence',
        measure: 'passed-quiz-rate',
      },
      {
        signalId: 'risk-tool-used-v1',
        label: 'Risk planning · calculator use',
        description: 'Risk calculator use is participation evidence, not proof of risk-management mastery.',
        attempts: progressEvents.some(item => item.event_key === 'risk-tool-used-v1') ? 1 : 0,
        positiveDecisions: null,
        successRate: null,
        confidence: 'participation-only',
        measure: 'milestone',
      },
    ],
    sampleSize: attempts.length + lessonAttempts.length,
    note: 'Practice signals are learning prompts, not predictions of trading performance. Skills last practised 14 or more days ago are suggested for review. Retention is only indicated by a positive decision after a 14-day gap; repeated attempts alone do not establish retained understanding. Risk calculator use measures participation only, not decision quality.',
  };
}
