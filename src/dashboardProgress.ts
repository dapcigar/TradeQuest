export type DashboardProgress = {
  lessonComplete: boolean;
  quizCorrect: boolean;
  xp: number;
  riskToolUsed: boolean;
  awardedActions: string[];
};

export type AccountProgressSnapshot = {
  xp: number;
  lessons_completed: string[];
  events: string[];
};

export function resolveDashboardProgress(
  signedIn: boolean,
  account: AccountProgressSnapshot | null,
  demo: DashboardProgress,
): DashboardProgress {
  if (!signedIn) return demo;

  // Never mix browser-local demo progress into an authenticated learner's dashboard.
  // In the current curriculum, a passed spread-basics assessment marks the first
  // mission complete across devices; account events are the source for risk-tool use.
  const foundationsComplete = account?.lessons_completed.includes('spread-basics') ?? false;
  return {
    lessonComplete: foundationsComplete,
    quizCorrect: foundationsComplete,
    xp: account?.xp ?? 0,
    riskToolUsed: account?.events.includes('risk-tool-used-v1') ?? false,
    awardedActions: [],
  };
}
