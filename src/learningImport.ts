import { isValidDateKey } from './dateKey';
import { localLearningDataKeys } from './learningExport';
export type LearningImport = { product: 'TradeQuest'; formatVersion: 1; exportedAt: string; scope: string; data: Partial<Record<(typeof localLearningDataKeys)[number], unknown>> };
const MAX_IMPORT_BYTES = 1_000_000;
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function validWeeklyPlan(value: unknown): boolean {
 if (!isRecord(value)) return false;
 return isValidDateKey(value.week)
  && [3,5,7].includes(Number(value.target)) && Array.isArray(value.completedDates)
  && value.completedDates.length <= 7 && value.completedDates.every(isValidDateKey);
}
export function parseLearningImport(raw: string): LearningImport {
 if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) throw new Error('This file is too large. Choose a TradeQuest export under 1 MB.');
 let parsed: unknown; try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error('This file is not valid JSON.'); }
 if (!isRecord(parsed) || parsed.product !== 'TradeQuest' || parsed.formatVersion !== 1 || typeof parsed.exportedAt !== 'string' || !isRecord(parsed.data))
  throw new Error('This is not a supported TradeQuest learning export (format version 1).');
 const data: LearningImport['data'] = {};
 for (const key of localLearningDataKeys) {
  if (!(key in parsed.data)) continue;
  const value = parsed.data[key];
  if (key === 'tradequest-weekly-practice-plan-v1') {
   if (!validWeeklyPlan(value)) throw new Error('The weekly practice plan in this file is invalid.');
   data[key] = value;
  } else {
   if (!Array.isArray(value) || value.length > 5000 || !value.every(isRecord)) throw new Error('A learning history in this file is invalid.');
   data[key] = value;
  }
 }
 if (!Object.keys(data).length) throw new Error('No supported learning records were found in this export.');
 return { product:'TradeQuest', formatVersion:1, exportedAt:parsed.exportedAt, scope:typeof parsed.scope==='string'?parsed.scope:'Browser-local learning records only.', data };
}
export function restoreLearningImport(imported: LearningImport, write: (key:string,value:string)=>void): string[] {
 const restored:string[]=[];
 for (const key of localLearningDataKeys) { if (!(key in imported.data)) continue; write(key,JSON.stringify(imported.data[key])); restored.push(key); }
 return restored;
}