import { Pool } from 'pg';
import dns from 'dns';

// Supabase `db.` subdomain is IPv6-only.
// Resolve via IPv6 explicitly so it works on Vercel (AWS Lambda).
const lookup = (host: string, opts: dns.LookupOptions, cb: (err: Error | null, address: string, family: number) => void) => {
  if (host.endsWith('.supabase.co') || host.endsWith('.pooler.supabase.com')) {
    dns.resolve6(host, (err, addresses) => {
      if (!err && addresses.length > 0) {
        cb(null, addresses[0], 6);
      } else {
        dns.lookup(host, { ...opts, all: false }, cb);
      }
    });
  } else {
    dns.lookup(host, opts, cb);
  }
};

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
      lookup,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function transaction<T>(fn: (query: (text: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
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
