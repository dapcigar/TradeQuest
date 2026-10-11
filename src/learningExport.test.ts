import { describe, expect, it } from 'vitest';
import { buildLearningExport, localLearningDataKeys } from './learningExport';

describe('browser-local learning export', () => {
  it('exports only the allowlisted learning keys and parses JSON values', () => {
    const values: Record<string, string> = {
      'tradequest-adaptive-practice-v1': '[{"variantId":"risk-definition-a"}]',
      'tradequest-weekly-practice-plan-v1': '{"target":5}',
      'tradequest-decision-journal-v1': '[{"title":"Review"}]',
      'supabase.auth.token': '{"access_token":"must-not-export"}',
      'other-app-private-data': '{"secret":"must-not-export"}',
    };
    const result = buildLearningExport(key => values[key] ?? null, '2026-10-12T12:00:00.000Z');
    expect(result.product).toBe('TradeQuest');
    expect(result.formatVersion).toBe(1);
    expect(result.exportedAt).toBe('2026-10-12T12:00:00.000Z');
    expect(Object.keys(result.data)).toEqual([...localLearningDataKeys]);
    expect(result.data['tradequest-weekly-practice-plan-v1']).toEqual({ target: 5 });
    expect(JSON.stringify(result)).not.toContain('must-not-export');
  });

  it('omits missing keys and preserves malformed values as text', () => {
    const result = buildLearningExport(
      key => key === 'tradequest-adaptive-practice-v1' ? 'not-json' : null,
      '2026-10-12T12:00:00.000Z',
    );
    expect(Object.keys(result.data)).toEqual(['tradequest-adaptive-practice-v1']);
    expect(result.data['tradequest-adaptive-practice-v1']).toEqual({ unparsedLocalValue: 'not-json' });
  });
});
