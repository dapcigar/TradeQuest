import { describe, expect, it } from 'vitest';
import { describeReplayCheckpoint } from './replayCheckpoint';

describe('replay decision checkpoints', () => {
  it.each([
    ['observe', 'wait for more evidence'],
    ['plan', 'invalidation'],
    ['pass', 'Passing is a valid process choice'],
  ] as const)('explains the %s choice without predicting outcomes', (choice, expected) => {
    expect(describeReplayCheckpoint(choice)).toContain(expected);
    expect(describeReplayCheckpoint(choice).toLowerCase()).not.toContain('guarantee');
  });
});
