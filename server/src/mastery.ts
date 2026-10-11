export type MasteryAttempt = { scenario_id: string; outcome: string; submitted_at?: string };
export type LessonMasteryAttempt = { lesson_id: string; score: number; passed: boolean; submitted_at?: string };
export type RiskPracticeEvent = { event_key: string; recorded_at?: string };

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

export function buildMastery(attempts: MasteryAttempt[], lessonAttempts: LessonMasteryAttempt[] = [], progressEvents: RiskPracticeEvent[] = []) {
  const skills = SKILLS.map(skill => {
    const relevant = attempts.filter(attempt => attempt.scenario_id === skill.scenarioId);
    const positive = relevant.filter(attempt => POSITIVE_OUTCOMES[skill.scenarioId].includes(attempt.outcome)).length;
    const count = relevant.length;
    return {
      skillId: skill.skillId, scenarioId: skill.scenarioId, label: skill.label,
      description: skill.description, attempts: count, positiveDecisions: positive,
      successRate: count ? Math.round((positive / count) * 100) : null,
      confidence: count >= 5 ? 'building' : count >= 3 ? 'early-signal' : 'not-enough-evidence',
    };
  });
  const recommended = [...skills].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    if (a.successRate === null && b.successRate !== null) return -1;
    if (b.successRate === null && a.successRate !== null) return 1;
    return (a.successRate ?? 0) - (b.successRate ?? 0);
  })[0];
  return {
    skills,
    recommendation: {
      scenarioId: recommended.scenarioId, skillId: recommended.skillId, title: recommended.label,
      reason: recommended.attempts === 0 ? 'Start here: you have not practised this skill yet.'
        : recommended.confidence === 'not-enough-evidence' ? 'Build a little more evidence with another practice attempt.'
          : 'This skill is your best next practice target based on your recent attempts.',
      attempts: recommended.attempts, confidence: recommended.confidence,
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
