import { describe, expect, it } from 'vitest';
import { filterGlossary, glossaryEntries } from './glossary';

describe('learning glossary', () => {
  it('contains a useful set of curated concepts', () => {
    expect(glossaryEntries.length).toBeGreaterThanOrEqual(12);
    expect(glossaryEntries.some(entry => entry.term === 'Risk budget')).toBe(true);
  });

  it('searches terms and explanations case-insensitively', () => {
    expect(filterGlossary(glossaryEntries, 'SLIPPAGE', 'All concepts').map(entry => entry.id)).toContain('slippage');
    expect(filterGlossary(glossaryEntries, 'maximum planned loss', 'All concepts').map(entry => entry.id)).toContain('risk-budget');
  });

  it('combines category and text filters', () => {
    const results = filterGlossary(glossaryEntries, 'stop', 'Risk management');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(entry => entry.category === 'Risk management')).toBe(true);
    expect(results.every(entry => [entry.term, entry.definition, entry.example, entry.caution ?? ''].some(text => text.toLowerCase().includes('stop')))).toBe(true);
  });

  it('returns all entries for an empty query and all-category filter', () => {
    expect(filterGlossary(glossaryEntries, '  ', 'All concepts')).toHaveLength(glossaryEntries.length);
  });

  it('returns no results for unmatched terms', () => {
    expect(filterGlossary(glossaryEntries, 'guaranteed profits', 'All concepts')).toEqual([]);
  });
});
