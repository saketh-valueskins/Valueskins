import { getSupabase } from './supabase';
import type { SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';

type QueryResult = { rows: any[]; rowCount?: number };

function isParamRef(s: string): boolean {
  return /^\$\d+$/.test(s.trim());
}

function isNowCall(s: string): boolean {
  return /^NOW\(\)$/i.test(s.trim());
}

function resolveValue(raw: string, params?: any[]): any {
  const s = raw.trim();
  if (isParamRef(s)) {
    const idx = parseInt(s.slice(1)) - 1;
    return params?.[idx];
  }
  if (isNowCall(s)) return new Date().toISOString();
  if (s.toUpperCase() === 'TRUE') return true;
  if (s.toUpperCase() === 'FALSE') return false;
  if (s.toUpperCase() === 'NULL') return null;
  if (/^['"]/.test(s)) return s.replace(/^['"]|['"]$/g, '');
  const n = Number(s);
  if (!isNaN(n) && s.length > 0) return n;
  return s;
}

const OP_MAP: Record<string, string> = {
  '=': 'eq', '!=': 'neq', '>': 'gt', '<': 'lt',
  '>=': 'gte', '<=': 'lte',
};

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const supabase = getSupabase();
  const sql = text.replace(/\s+/g, ' ').trim();

  // SELECT expr (without FROM) — used by health check etc.
  const bareSelectMatch = sql.match(/^SELECT\s+(.+)$/i);
  if (bareSelectMatch && !/\bFROM\b/i.test(sql)) {
    const exprs = bareSelectMatch[1].split(',').map(s => s.trim());
    const row: Record<string, any> = {};
    for (const expr of exprs) {
      const m = expr.match(/(.+?)\s+as\s+(\w+)$/i);
      if (m) {
        row[m[2]] = resolveValue(m[1], params);
      } else {
        row[expr] = resolveValue(expr, params);
      }
    }
    return { rows: [row] };
  }

  // SELECT ... FROM table WHERE ...
  const selectMatch = sql.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
  if (selectMatch) {
    const [, columns, table, whereClause, orderBy, limitStr] = selectMatch;
    const cols = columns === '*' ? '*' : columns;
    let q = supabase.from(table).select(cols) as any;
    if (whereClause) {
      const parts = whereClause.split(/\s+AND\s+/i);
      for (const part of parts) {
        const m = part.match(/^(\w+)\s*(=|!=|>|<|>=|<=|IS|IN|LIKE|NOT LIKE)\s*(.+)$/i);
        if (m) {
          const [, col, op, rawVal] = m;
          const mapped = OP_MAP[op.toUpperCase()] || op.toLowerCase();
          const val = resolveValue(rawVal, params);
          q = q[mapped](col, val);
        }
      }
    }
    if (orderBy) {
      const [col, dir] = orderBy.split(/\s+/);
      q = q.order(col, { ascending: dir?.toUpperCase() !== 'DESC' });
    }
    if (limitStr) q = q.limit(parseInt(limitStr));
    const { data, error } = await q;
    if (error) throw error;
    return { rows: data || [] };
  }

  // INSERT INTO table (cols) VALUES (vals) RETURNING col
  const insertMatch = sql.match(
    /^INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)(?:\s+RETURNING\s+(.+?))?$/i
  );
  if (insertMatch) {
    const [, table, colsStr, valsStr, returning] = insertMatch;
    const columns = colsStr.split(',').map((c: string) => c.trim());
    const rawVals = valsStr.split(',').map((v: string) => v.trim());
    const values: Record<string, any> = {};
    columns.forEach((col, i) => {
      values[col] = resolveValue(rawVals[i] || '', params);
    });
    let q = supabase.from(table).insert(values).select();
    const { data, error } = await q;
    if (error) throw error;
    return { rows: data || [] };
  }

  // UPDATE table SET col = val, ... WHERE ...
  const updateMatch = sql.match(
    /^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i
  );
  if (updateMatch) {
    const [, table, setClause, whereClause] = updateMatch;
    const pairs = setClause.split(',').map((s: string) => s.trim());
    const values: Record<string, any> = {};
    for (const pair of pairs) {
      const m = pair.match(/^(\w+)\s*=\s*(.+)$/);
      if (m) {
        const [, col, raw] = m;
        values[col] = resolveValue(raw, params);
      }
    }
    let q = supabase.from(table).update(values) as any;
    if (whereClause) {
      const parts = whereClause.split(/\s+AND\s+/i);
      for (const part of parts) {
        const m = part.match(/^(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+)$/i);
        if (m) {
          const [, col, op, rawVal] = m;
          const val = resolveValue(rawVal, params);
          q = q[OP_MAP[op] || 'eq'](col, val);
        }
      }
    }
    const { data, error } = await q;
    if (error) throw error;
    return { rows: data || [] };
  }

  throw new Error(
    `[db] Cannot translate to Supabase REST: ${sql.substring(0, 120)}. ` +
    `Use direct supabase client calls for complex queries.`
  );
}

export async function queryOne(text: string, params?: any[]): Promise<any> {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function transaction<T>(fn: (q: (text: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
  return fn(query);
}

export async function getPool(): Promise<never> {
  throw new Error('Direct pg pool not available. Use query() (backed by Supabase REST).');
}
