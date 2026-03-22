import { LRUCache } from "lru-cache";

interface RateLimitOptions {
  interval: number; // ms
  uniqueTokenPerInterval: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const cache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check(token: string): { success: boolean; remaining: number; reset: number } {
      const now = Date.now();
      const windowStart = now - options.interval;
      const timestamps = cache.get(token) ?? [];
      const valid = timestamps.filter((t) => t > windowStart);

      if (valid.length >= options.maxRequests) {
        return {
          success: false,
          remaining: 0,
          reset: Math.ceil((valid[0]! + options.interval - now) / 1000),
        };
      }

      valid.push(now);
      cache.set(token, valid);
      return {
        success: true,
        remaining: options.maxRequests - valid.length,
        reset: Math.ceil(options.interval / 1000),
      };
    },
  };
}

// Pre-configured limiters
export const apiRateLimiter = createRateLimiter({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
  maxRequests: 100,
});

export const authRateLimiter = createRateLimiter({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
  maxRequests: 10,
});
