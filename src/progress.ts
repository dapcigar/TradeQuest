export type ProgressState = {
  lessonComplete: boolean;
  quizCorrect: boolean;
  xp: number;
  riskToolUsed: boolean;
  awardedActions: string[];
};

export function normaliseProgress(raw: unknown, initial: ProgressState): ProgressState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return initial;
  const value = raw as Partial<ProgressState>;
  const xp = typeof value.xp === 'number' && Number.isFinite(value.xp) && value.xp >= 0
    ? Math.min(value.xp, 1_000_000)
    : initial.xp;
  const awardedActions = Array.isArray(value.awardedActions)
    ? [...new Set(value.awardedActions.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 500)
    : [];
  return {
    lessonComplete: value.lessonComplete === true,
    quizCorrect: value.quizCorrect === true,
    riskToolUsed: value.riskToolUsed === true,
    xp,
    awardedActions,
  };
}

export function awardProgressXPOnce<T extends ProgressState>(progress: T, actionId: string, amount: number): T {
  if (!actionId.trim()) throw new Error('An action ID is required.');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('XP amount must be a non-negative finite number.');
  if (progress.awardedActions.includes(actionId)) return progress;
  return {
    ...progress,
    xp: Math.min(1_000_000, progress.xp + amount),
    awardedActions: [...progress.awardedActions, actionId].slice(-500),
  };
}
