import { describe, expect, it } from 'vitest';
import { isValidDateKey } from './dateKey';

describe('calendar date keys', () => {
  it('accepts valid ISO calendar dates including leap days', () => {
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2026-10-13')).toBe(true);
  });

  it('rejects impossible calendar dates and malformed values', () => {
    for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31', '2026-1-01', '', null, 20261013]) {
      expect(isValidDateKey(value)).toBe(false);
    }
  });
});
