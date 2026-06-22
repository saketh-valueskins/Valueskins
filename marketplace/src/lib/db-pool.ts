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
      return { host: addrs[0], port, database, user, password, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } };
    }
  } catch {}
  return { host, port, database, user, password, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } };
}

let pool: Pool | null = null;
let resolving: Promise<void> | null = null;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    if (!resolving) {
      resolving = (async () => {
        const cfg = await buildPoolConfig(process.env.DATABASE_URL || '');
        pool = new Pool(cfg);
      })();
    }
    await resolving;
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const p = await getPool();
  const start = Date.now();
  try {
    const result = await p.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms`, text.substring(0, 100));
    }
    return result;
  } catch (error) {
    console.error('Query error:', { text: text.substring(0, 100), error });
    throw error;
  }
}

export async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0];
}

export async function transaction(fn: (client: any) => Promise<void>) {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
