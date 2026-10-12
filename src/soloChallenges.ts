export type SoloChallenge = {
  id: string;
  scenarioId: string;
  title: string;
  description: string;
  focus: string;
  positiveOutcome: string;
  rubric: string;
  estimatedMinutes: number;
};

export type ChallengeAttempt = {
  scenarioId?: string;
  outcome: string;
  feedback: string;
  submittedAt: string;
};

export const soloChallenges: SoloChallenge[] = [
  {
    id: 'QUEST-001',
    scenarioId: 'TQ-SYN-003',
    title: 'The patient explorer',
    description: 'Review a fictional chart. Identify what evidence is missing before considering a decision.',
    focus: 'Evidence focus',
    positiveOutcome: 'evidence-led',
    rubric: 'Wait for defined evidence; do not treat urgency or a possible move as confirmation.',
    estimatedMinutes: 10,
  },
  {
    id: 'QUEST-002',
    scenarioId: 'TQ-SYN-002',
    title: 'Risk budget detective',
    description: 'Compare hypothetical plans and choose the one that respects a stated loss limit.',
    focus: 'Risk focus',
    positiveOutcome: 'risk-aware',
    rubric: 'Keep the planned loss within the stated budget; resize or pass when it does not fit.',
    estimatedMinutes: 8,
  },
];

export function summariseChallengeAttempts(
  attempts: ChallengeAttempt[],
  scenarioId: string,
  positiveOutcome: string,
) {
  const matching = attempts
    .filter(attempt => attempt.scenarioId === scenarioId)
    .map((attempt, index) => ({ attempt, index, timestamp: Date.parse(attempt.submittedAt) }))
    .sort((a, b) => {
      if (Number.isFinite(a.timestamp) && Number.isFinite(b.timestamp)) return b.timestamp - a.timestamp;
      if (Number.isFinite(a.timestamp)) return -1;
      if (Number.isFinite(b.timestamp)) return 1;
      return a.index - b.index;
    });
  const latest = matching[0]?.attempt;
  return {
    attempts: matching.length,
    latestOutcome: latest?.outcome ?? null,
    latestFeedback: latest?.feedback ?? null,
    latestSubmittedAt: latest?.submittedAt ?? null,
    rubricMet: latest ? latest.outcome === positiveOutcome : null,
  };
}
