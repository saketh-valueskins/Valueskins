import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL || '';

let client: Redis | null = null;

function getClient(): Redis | null {
  if (client) return client;
  if (!redisUrl) return null;

  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  return client;
}

const CACHE_TTL = 60;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getClient();
    if (!r) return null;
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = CACHE_TTL): Promise<void> {
  try {
    const r = getClient();
    if (!r) return;
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silently fail
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const r = getClient();
    if (!r) return;
    await r.del(key);
  } catch {
    // silently fail
  }
}

export async function cacheKeys(pattern: string): Promise<string[]> {
  try {
    const r = getClient();
    if (!r) return [];
    return await r.keys(pattern);
  } catch {
    return [];
  }
}

export function buildCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  return `vs:${prefix}:${parts.filter(Boolean).join(':')}`;
}
