/**
 * Rate Limiting Middleware
 * Per-user and per-IP rate limiting using in-memory store
 */

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

const RATE_LIMITS = {
  // Per user per minute
  'api:user': { maxRequests: 100, windowMs: 60 * 1000 },
  // Per IP per minute (unauthenticated)
  'api:ip': { maxRequests: 50, windowMs: 60 * 1000 },
  // Auth endpoints per IP per hour
  'auth:ip': { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  // Signup per IP per hour
  'signup:ip': { maxRequests: 10, windowMs: 60 * 60 * 1000 },
};

function cleanupExpired() {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  count: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  limitType: keyof typeof RATE_LIMITS = 'api:user'
): RateLimitResult {
  cleanupExpired();

  const config = RATE_LIMITS[limitType];
  const now = Date.now();

  if (!store[key]) {
    store[key] = { count: 1, resetTime: now + config.windowMs };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      count: 1,
      limit: config.maxRequests,
    };
  }

  const record = store[key];

  if (record.resetTime < now) {
    record.count = 1;
    record.resetTime = now + config.windowMs;
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      count: 1,
      limit: config.maxRequests,
    };
  }

  record.count++;

  if (record.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
      count: record.count,
      limit: config.maxRequests,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    count: record.count,
    limit: config.maxRequests,
  };
}

export function getRateLimitKey(userId?: string, ip?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  if (ip) {
    return `ip:${ip}`;
  }
  return 'anonymous';
}
