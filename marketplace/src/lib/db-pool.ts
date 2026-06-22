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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
  lookup,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
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
  const client = await pool.connect();
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
