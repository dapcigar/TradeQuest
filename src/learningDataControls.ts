export const LOCAL_LEARNING_KEYS = [
  'tradequest-weekly-practice-plan-v1',
  'tradequest-adaptive-practice-v1',
  'tradequest-decision-journal-v1',
] as const;

export type LocalLearningStorage = Pick<Storage, 'removeItem'>;

export function clearLocalLearningData(storage: LocalLearningStorage): number {
  let removed = 0;
  for (const key of LOCAL_LEARNING_KEYS) {
    try { storage.removeItem(key); removed += 1; } catch { /* Continue with other allowlisted keys. */ }
  }
  return removed;
}
