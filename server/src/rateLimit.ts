// Fixed-window limiter keyed by learner ID. State is per serverless instance, so it
// bounds bursts from one client but is not a global quota; use Vercel Firewall rules
// for a hard, shared limit.
export interface RateLimiter {
  allow(key: string, now?: number): boolean;
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(key, now = Date.now()) {
      if (windows.size > 5000) {
        for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
      }
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= maxRequests;
    },
  };
}
