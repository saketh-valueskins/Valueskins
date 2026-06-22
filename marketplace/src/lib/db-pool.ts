import { query as dbQuery, queryOne as dbQueryOne, transaction as dbTransaction } from './db';

// Re-export from db.ts (which uses Supabase REST API)
export async function query(text: string, params?: any[]) {
  return dbQuery(text, params);
}

export async function queryOne(text: string, params?: any[]) {
  return dbQueryOne(text, params);
}

export async function transaction(fn: (client: any) => Promise<void>) {
  return dbTransaction(fn);
}

export async function getPool(): Promise<never> {
  throw new Error('Direct pg pool is not available. Use query() instead (backed by Supabase REST).');
}

export const pool = null;
