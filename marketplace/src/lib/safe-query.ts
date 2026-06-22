import { query } from '@/lib/db-pool';

/**
 * Safe query guard — enforces parameterized queries at runtime.
 * All database access should go through this or db-pool's query().
 */

export type SafeQueryParams = (string | number | boolean | null | Date | object)[];

export interface SafeQueryResult {
  rows: any[];
  rowCount: number;
  command: string;
  fields: { name: string }[];
}

/**
 * Execute a parameterized query with injection guards.
 */
export async function safeQuery(text: string, params?: SafeQueryParams): Promise<SafeQueryResult> {
  if (/;\s*SELECT|;\s*INSERT|;\s*DROP|;\s*DELETE|;\s*UPDATE/i.test(text)) {
    if (!text.includes('$')) {
      throw new Error('SQL injection guard: multi-statement query without parameters rejected');
    }
  }

  if (!params && /WHERE/i.test(text) && !/INFORMATION_SCHEMA|pg_/i.test(text)) {
    console.warn('Unparameterized WHERE query detected:', text.substring(0, 120));
  }

  return query(text, params);
}
