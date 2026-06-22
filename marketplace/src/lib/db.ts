import { Pool, PoolConfig } from 'pg';
import dns from 'dns';

async function buildPoolConfig(rawUrl: string): Promise<PoolConfig> {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname;
  const port = parseInt(parsed.port || '5432');
  const database = parsed.pathname.replace(/^\//, '');
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  try {
    const addrs = await dns.promises.resolve6(host);
    if (addrs.length > 0) {
      return { host: addrs[0], port, database, user, password, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } };
    }
  } catch {}
  return { host, port, database, user, password, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } };
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;

let pool: Pool | null = null;
let resolving: Promise<void> | null = null;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    if (!resolving) {
      resolving = (async () => {
        const cfg = await buildPoolConfig(DATABASE_URL || '');
        pool = new Pool(cfg);
      })();
    }
    await resolving;
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const client = await (await getPool()).connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function transaction<T>(fn: (query: (text: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn((text: string, params?: any[]) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
