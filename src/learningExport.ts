export const localLearningDataKeys = [
  'tradequest-adaptive-practice-v1',
  'tradequest-weekly-practice-plan-v1',
  'tradequest-decision-journal-v1',
] as const;

export type LearningExport = {
  product: 'TradeQuest';
  formatVersion: 1;
  exportedAt: string;
  scope: string;
  data: Record<string, unknown>;
};

export function buildLearningExport(
  read: (key: string) => string | null,
  exportedAt: string,
): LearningExport {
  const data: Record<string, unknown> = {};
  for (const key of localLearningDataKeys) {
    const raw = read(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw) as unknown;
    } catch {
      // Preserve malformed local data as text rather than silently dropping it.
      data[key] = { unparsedLocalValue: raw };
    }
  }
  return {
    product: 'TradeQuest',
    formatVersion: 1,
    exportedAt,
    scope: 'Allowlisted browser-local practice data only; account data stored on the server is not included.',
    data,
  };
}

export function downloadLearningExport(
  read: (key: string) => string | null,
  now: Date = new Date(),
): void {
  const payload = buildLearningExport(read, now.toISOString());
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tradequest-learning-export-${now.toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
