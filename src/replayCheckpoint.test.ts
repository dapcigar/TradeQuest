import { describe, expect, it } from 'vitest';
import { describeReplayCheckpoint, summariseReplayCheckpoints } from './replayCheckpoint';

describe('replay decision checkpoints', () => {
  it.each([
    ['observe', 'wait for more evidence'],
    ['plan', 'invalidation'],
    ['pass', 'Passing is a valid process choice'],
  ] as const)('explains the %s choice without predicting outcomes', (choice, expected) => {
    expect(describeReplayCheckpoint(choice)).toContain(expected);
    expect(describeReplayCheckpoint(choice).toLowerCase()).not.toContain('guarantee');
  });

  it('summarises recorded process choices without treating them as a score', () => {
    const summary = summariseReplayCheckpoints([
      { choice: 'observe', note: 'wait for close', revealedIndex: 1 },
      { choice: 'plan', note: 'define invalidation', revealedIndex: 2 },
      { choice: 'pass', note: '', revealedIndex: 3 },
      { choice: 'observe', note: '', revealedIndex: 4 },
    ]);
    expect(summary).toMatchObject({ total: 4, counts: { observe: 2, plan: 1, pass: 1 } });
    expect(summary.reflection).toContain('Review your notes');
    expect(summary.reflection.toLowerCase()).not.toContain('win rate');
  });

  it('gives a useful empty-state prompt when no checkpoints exist', () => {
    const summary = summariseReplayCheckpoints([]);
    expect(summary.total).toBe(0);
    expect(summary.reflection).toContain('Try another replay');
  });

  it('does not label one process choice as universally best', () => {
    const summary = summariseReplayCheckpoints([{ choice: 'pass', note: '', revealedIndex: 1 }]);
    expect(summary.counts.pass).toBe(1);
    expect(summary.reflection).toContain('Reflect on what information');
  });
});
