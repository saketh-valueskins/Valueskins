import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim());
  const userId = req.headers['x-user-id'] as string;
  if (!userId || (adminIds.length > 0 && !adminIds.includes(userId))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const results: { name: string; success: boolean; error?: string }[] = [];
  let allPassed = true;

  // Run escrow-v2 migration SQL
  try {
    const sqlPath = path.join(process.cwd(), 'src', 'lib', 'migrations-escrow-v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split on semicolons to run each statement individually
    // (pg driver can't run multiple statements in a single query call)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let ran = 0;

    for (const stmt of statements) {
      try {
        await query(stmt);
        ran++;
      } catch (err: any) {
        // "already exists" errors are safe to skip
        const msg = err.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate column')) {
          continue;
        }
        throw err;
      }
    }

    results.push({ name: 'migrations-escrow-v2.sql', success: true });
  } catch (err: any) {
    allPassed = false;
    results.push({ name: 'migrations-escrow-v2.sql', success: false, error: err.message });
  }

  // Run index migrations (100k-user scale)
  try {
    const { runIndexMigrations } = await import('@/lib/migrations-indexes');
    await runIndexMigrations();
    results.push({ name: 'runIndexMigrations', success: true });
  } catch (err: any) {
    allPassed = false;
    results.push({ name: 'runIndexMigrations', success: false, error: err.message });
  }

  // Also run the TypeScript-based migrations for older tables
  try {
    const { runMigrations2, addRemindersTables, addEscrowMigrations, addEventFeaturesMigrations } = await import('@/lib/migrations-2');
    await runMigrations2();
    results.push({ name: 'runMigrations2', success: true });
    await addRemindersTables();
    results.push({ name: 'addRemindersTables', success: true });
    await addEscrowMigrations();
    results.push({ name: 'addEscrowMigrations', success: true });
    await addEventFeaturesMigrations();
    results.push({ name: 'addEventFeaturesMigrations', success: true });
  } catch (err: any) {
    allPassed = false;
    results.push({ name: 'ts-migrations', success: false, error: err.message });
  }

  return res.status(allPassed ? 200 : 500).json({
    success: allPassed,
    results,
    timestamp: new Date().toISOString(),
  });
}
