import { SKILL_CATALOGUE } from './skillCatalogue.js';

export type MasteryAttempt = { scenario_id: string; outcome: string; submitted_at?: string };
export type LessonMasteryAttempt = { lesson_id: string; score: number; passed: boolean; submitted_at?: string };
export type RiskPracticeEvent = { event_key: string; recorded_at?: string };

export type Confidence = 'not-enough-evidence' | 'early-signal' | 'building';

// Confidence is deliberately slow to rise: repeating one scenario never builds it,
// because that measures recall of an answer rather than the principle behind it.
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

// Oldest first. The API reads newest-first; rows without timestamps are assumed to be in order already.
function chronological(attempts: MasteryAttempt[]): MasteryAttempt[] {
  if (attempts.some(attempt => !attempt.submitted_at)) return [...attempts];
  return [...attempts].sort((a, b) => Date.parse(a.submitted_at!) - Date.parse(b.submitted_at!));
}

export function buildMastery(attempts: MasteryAttempt[], lessonAttempts: LessonMasteryAttempt[] = [], progressEvents: RiskPracticeEvent[] = []) {
  const skills = SKILL_CATALOGUE.map(skill => {
    const relevant = chronological(attempts.filter(attempt => (skill.scenarioIds as readonly string[]).includes(attempt.scenario_id)));
    // Recall: a scenario the learner has already seen. Application: the first attempt at a
    // scenario they have not seen. Application attempts after the skill's first are transfer.
    const seen = new Set<string>();
    const recall: MasteryAttempt[] = [];
    const application: MasteryAttempt[] = [];
    let transferAttempts: MasteryAttempt[] = [];
    for (const attempt of relevant) {
      if (seen.has(attempt.scenario_id)) { recall.push(attempt); continue; }
      if (seen.size > 0) transferAttempts = [...transferAttempts, attempt];
      application.push(attempt);
      seen.add(attempt.scenario_id);
    }
    const overall = summarise(relevant, skill.positiveOutcomes, confidenceFor(relevant.length, seen.size));
    const transfer = summarise(transferAttempts, skill.positiveOutcomes, confidenceFor(transferAttempts.length, transferAttempts.length));
    return {
      skillId: skill.skillId, scenarioId: skill.scenarioIds[0], label: skill.label,
      description: skill.description, attempts: overall.attempts, positiveDecisions: overall.positiveDecisions,
      successRate: overall.successRate, confidence: overall.confidence,
      distinctScenarios: seen.size, scenariosAvailable: skill.scenarioIds.length,
      recall: summarise(recall, skill.positiveOutcomes, capAtEarlySignal(confidenceFor(recall.length, seen.size))),
      application: { ...summarise(application, skill.positiveOutcomes, confidenceFor(application.length, application.length)),
        transferAttempts: transfer.attempts, transferPositiveDecisions: transfer.positiveDecisions },
      seenScenarioIds: [...seen],
      scenarioIds: skill.scenarioIds,
    };
  });
  const recommended = [...skills].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    if (a.successRate === null && b.successRate !== null) return -1;
    if (b.successRate === null && a.successRate !== null) return 1;
    return (a.successRate ?? 0) - (b.successRate ?? 0);
  })[0];
  // Prefer a scenario the learner has not seen so practice tests transfer, not memory.
  const unseenScenarioId = recommended.scenarioIds.find(id => !recommended.seenScenarioIds.includes(id));
  const nextScenarioId = unseenScenarioId ?? recommended.seenScenarioIds[0] ?? recommended.scenarioIds[0];
  const publicSkills = skills.map(({ seenScenarioIds: _seen, scenarioIds: _ids, ...skill }) => skill);
  return {
    skills: publicSkills,
    recommendation: {
      scenarioId: nextScenarioId, skillId: recommended.skillId, title: recommended.label,
      reason: recommended.attempts === 0 ? 'Start here: you have not practised this skill yet.'
        : unseenScenarioId ? 'Try a new scenario that applies the same principle. An unfamiliar situation shows whether the idea carries over, not just whether you remember an answer.'
          : 'You have seen every scenario for this skill, so repeating one mostly tests recall. Revisit it, then look for new scenarios as they are added.',
      attempts: recommended.attempts, confidence: recommended.confidence, isNewScenario: unseenScenarioId !== undefined,
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
    note: 'Practice signals are learning prompts, not predictions of trading performance. Risk calculator use measures participation only, not decision quality.',
  };
}
