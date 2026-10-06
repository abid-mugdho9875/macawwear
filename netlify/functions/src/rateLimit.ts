/**
 * Tiny in-memory token-bucket-ish rate limiter, per (key, window).
 * Fine for a single-function process. On Netlify each invocation may be cold,
 * so this is best-effort — but it blocks the most common abuse cases.
 */

import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "./api";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true };
}

export function _resetRateLimitForTests(): void {
  buckets.clear();
}