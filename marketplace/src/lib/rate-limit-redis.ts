import Redis from 'ioredis';

// Use Redis for distributed rate limiting (works across serverless instances)
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  if (!redis) {
    console.warn('Redis not configured, rate limiting disabled');
    return true;
  }

  try {
    const now = Date.now();
    const windowKey = `rate-limit:${key}:${Math.floor(now / windowMs)}`;

    const count = await redis.incr(windowKey);

    if (count === 1) {
      // First request in this window, set expiry
      await redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    return count <= maxRequests;
  } catch (err) {
    console.error('Rate limit error:', err);
    // Fail open on Redis error
    return true;
  }
}

export async function getRateLimitStatus(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ remaining: number; resetTime: number } | null> {
  if (!redis) return null;

  try {
    const now = Date.now();
    const windowKey = `rate-limit:${key}:${Math.floor(now / windowMs)}`;
    const count = await redis.get(windowKey);
    const ttl = await redis.ttl(windowKey);

    return {
      remaining: Math.max(0, maxRequests - (parseInt(count || '0') || 0)),
      resetTime: now + (ttl > 0 ? ttl * 1000 : windowMs),
    };
  } catch (err) {
    return null;
  }
}

export function clearRateLimitKey(key: string): Promise<number> {
  if (!redis) return Promise.resolve(0);
  return redis.del(`rate-limit:${key}*`);
}
