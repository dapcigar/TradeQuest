import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimit.js';

describe('createRateLimiter', () => {
  it('allows up to the limit then blocks within the window', () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 10)).toBe(true);
    expect(limiter.allow('a', 20)).toBe(false);
  });

  it('tracks learners independently and resets after the window', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('b', 0)).toBe(true);
    expect(limiter.allow('a', 500)).toBe(false);
    expect(limiter.allow('a', 1000)).toBe(true);
  });
});
