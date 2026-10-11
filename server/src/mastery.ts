import { SKILL_CATALOGUE } from './skillCatalogue.js';

export type MasteryAttempt = { scenario_id: string; outcome: string; submitted_at?: string };
export type LessonMasteryAttempt = { lesson_id: string; score: number; passed: boolean; submitted_at?: string };
export type RiskPracticeEvent = { event_key: string; recorded_at?: string };

const REVIEW_AFTER_DAYS = 14;
const REVIEW_AFTER_MS = REVIEW_AFTER_DAYS * 24 * 60 * 60 * 1000;

function validTimestamp(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type Confidence = 'not-enough-evidence' | 'early-signal' | 'building';

// Breadth-aware confidence for the recall/application buckets: repeating one scenario
// measures memory of an answer rather than the principle behind it, so it never builds.
export function confidenceFor(attempts: number, distinctScenarios: number): Confidence {
  if (attempts >= 5 && distinctScenarios >= 3) return 'building';
  if (attempts >= 3 && distinctScenarios >= 2) return 'early-signal';
  return 'not-enough-evidence';
}

function capAtEarlySignal(confidence: Confidence): Confidence {
  return confidence === 'building' ? 'early-signal' : confidence;
}

function summarise(attempts: MasteryAttempt[], positiveOutcomes: readonly string[], confidence: Confidence) {
  const positive = attempts.filter(attempt => positiveOutcomes.includes(attempt.outcome)).length;
  return {
    attempts: attempts.length,
    positiveDecisions: positive,
    successRate: attempts.length ? Math.round((positive / attempts.length) * 100) : null,
    confidence,
  };
}

// Oldest first. The API reads newest-first; rows without usable timestamps are assumed to be in order already.
function inSubmissionOrder(attempts: MasteryAttempt[]): MasteryAttempt[] {
  if (attempts.some(attempt => validTimestamp(attempt.submitted_at) === null)) return [...attempts];
  return [...attempts].sort((a, b) => validTimestamp(a.submitted_at)! - validTimestamp(b.submitted_at)!);
}

export function buildMastery(
  attempts: MasteryAttempt[],
  lessonAttempts: LessonMasteryAttempt[] = [],
  progressEvents: RiskPracticeEvent[] = [],
  now: Date = new Date(),
) {
  const reviewCutoff = now.getTime() - REVIEW_AFTER_MS;
  const skills = SKILL_CATALOGUE.map(skill => {
    const positiveOutcomes: readonly string[] = skill.positiveOutcomes;
    const relevant = attempts.filter(attempt => (skill.scenarioIds as readonly string[]).includes(attempt.scenario_id));
    const chronological = relevant
      .map(attempt => ({ ...attempt, timestamp: validTimestamp(attempt.submitted_at) }))
      .filter((attempt): attempt is MasteryAttempt & { timestamp: number } => attempt.timestamp !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
    const positive = relevant.filter(attempt => positiveOutcomes.includes(attempt.outcome)).length;
    const count = relevant.length;
    const timestamps = chronological.map(attempt => attempt.timestamp);
    const lastPractisedMs = timestamps.length ? Math.max(...timestamps) : null;
    const lastPractisedAt = lastPractisedMs === null ? null : new Date(lastPractisedMs).toISOString();
    const reviewStatus = count === 0 ? 'not-yet-practised'
      : lastPractisedMs === null ? 'date-unavailable'
        : lastPractisedMs <= reviewCutoff ? 'review-due' : 'recently-practised';

    const firstAttempt = chronological[0];
    const firstAttemptPositive = firstAttempt
      ? positiveOutcomes.includes(firstAttempt.outcome)
      : null;
    const delayedReviews = chronological.filter((attempt, index) =>
      index > 0 && attempt.timestamp - chronological[index - 1].timestamp >= REVIEW_AFTER_MS,
    );
    const retainedAfterReview = delayedReviews.some(attempt =>
      positiveOutcomes.includes(attempt.outcome),
    );
    const retentionStatus = count === 0 ? 'not-yet-practised'
      : !firstAttempt ? 'date-unavailable'
        : delayedReviews.length === 0 ? 'awaiting-delayed-review'
          : retainedAfterReview ? 'retained-after-review' : 'needs-reinforcement';
    // Repetition alone is not mastery: the stronger signal requires a positive
    // decision after a meaningful gap, plus at least one other positive decision.
    const confidence = retainedAfterReview && positive >= 2 ? 'building'
      : count >= 3 ? 'early-signal' : 'not-enough-evidence';

    // Recall: a scenario the learner has already seen. Application: the first attempt at a
    // scenario they have not seen. Application attempts after the skill's first are transfer.
    const seen = new Set<string>();
    const recall: MasteryAttempt[] = [];
    const application: MasteryAttempt[] = [];
    const transfer: MasteryAttempt[] = [];
    for (const attempt of inSubmissionOrder(relevant)) {
      if (seen.has(attempt.scenario_id)) { recall.push(attempt); continue; }
      if (seen.size > 0) transfer.push(attempt);
      application.push(attempt);
      seen.add(attempt.scenario_id);
    }
    const transferSummary = summarise(transfer, positiveOutcomes, 'not-enough-evidence');

    return {
      skillId: skill.skillId, scenarioId: skill.scenarioIds[0], label: skill.label,
      description: skill.description, attempts: count, positiveDecisions: positive,
      successRate: count ? Math.round((positive / count) * 100) : null,
      confidence,
      lastPractisedAt,
      reviewStatus,
      firstAttemptPositive,
      delayedReviewAttempts: delayedReviews.length,
      retentionStatus,
      distinctScenarios: seen.size, scenariosAvailable: skill.scenarioIds.length,
      recall: summarise(recall, positiveOutcomes, capAtEarlySignal(confidenceFor(recall.length, seen.size))),
      application: { ...summarise(application, positiveOutcomes, confidenceFor(application.length, application.length)),
        transferAttempts: transferSummary.attempts, transferPositiveDecisions: transferSummary.positiveDecisions },
      seenScenarioIds: [...seen],
      scenarioIds: skill.scenarioIds,
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
  // Prefer a scenario the learner has not seen so practice tests transfer, not memory.
  const unseenScenarioId = recommended.scenarioIds.find(id => !recommended.seenScenarioIds.includes(id));
  const nextScenarioId = unseenScenarioId ?? recommended.seenScenarioIds[0] ?? recommended.scenarioIds[0];
  const variationNote = recommended.attempts === 0 ? ''
    : unseenScenarioId ? ' Try a scenario you have not seen, so it tests the idea rather than a remembered answer.'
      : ' You have seen every scenario for this skill, so repeating one mostly tests recall.';
  const publicSkills = skills.map(({ seenScenarioIds: _seen, scenarioIds: _ids, ...skill }) => skill);
  return {
    skills: publicSkills,
    recommendation: {
      scenarioId: nextScenarioId, isNewScenario: unseenScenarioId !== undefined, skillId: recommended.skillId, title: recommended.label,
      reason: reason + variationNote, attempts: recommended.attempts, confidence: recommended.confidence,
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
