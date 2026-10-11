import { describe, expect, it, vi } from 'vitest';
import { clearLocalLearningData, LOCAL_LEARNING_KEYS } from './learningDataControls';

describe('clearLocalLearningData', () => {
  it('removes only the allowlisted local learning keys', () => {
    const removeItem = vi.fn();
    expect(clearLocalLearningData({ removeItem })).toBe(3);
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([...LOCAL_LEARNING_KEYS]);
  });
  it('continues when one key cannot be removed', () => {
    const removeItem = vi.fn((key: string) => { if (key === LOCAL_LEARNING_KEYS[1]) throw new Error('blocked'); });
    expect(clearLocalLearningData({ removeItem })).toBe(2);
    expect(removeItem).toHaveBeenCalledTimes(3);
  });
});
