import { describe, expect, it } from 'vitest';
import { collectAllPages } from './masteryHistory.js';

describe('collectAllPages', () => {
  it('collects all records across page boundaries without a recent-history truncation', async () => {
    const records = Array.from({ length: 1_201 }, (_, id) => ({ id }));
    const ranges: Array<[number, number]> = [];
    const result = await collectAllPages(async (from, to) => {
      ranges.push([from, to]);
      return { data: records.slice(from, to + 1), error: null };
    }, 500);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1_201);
    expect(result.data?.[0]).toEqual({ id: 0 });
    expect(result.data?.at(-1)).toEqual({ id: 1_200 });
    expect(ranges).toEqual([[0, 499], [500, 999], [1_000, 1_499]]);
  });

  it('does not return a partial history if a page fails', async () => {
    const failure = new Error('database unavailable');
    const result = await collectAllPages(async (from) => from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: failure }, 1);
    expect(result.data).toBeNull();
    expect(result.error).toBe(failure);
  });

  it('rejects invalid page sizes before querying', async () => {
    let called = false;
    const result = await collectAllPages(async () => { called = true; return { data: [], error: null }; }, 0);
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(called).toBe(false);
  });
});
