#!/usr/bin/env node
// Apply SQL migrations to a Postgres database.
//
// The production database was empty — zero tables — which is why OAuth failed
// with "Connection terminated unexpectedly" once the connection string was
// fixed: there was no users table to write to.
//
// Seed data (005_seed_all_data.sql) is NOT applied by default. Production is
// meant to start clean, with every account a genuinely new creator/brand.
// Pass --with-seed to include it (useful for a staging database).
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/run-migrations.js [--with-seed] [--dry-run]

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'marketplace', 'src', 'lib', 'migrations');
const SEED_FILE = '005_seed_all_data.sql';

const withSeed = process.argv.includes('--with-seed');
const dryRun = process.argv.includes('--dry-run');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

function migrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => withSeed || f !== SEED_FILE)
    .sort(); // numeric prefixes make lexical order the correct order
}

async function main() {
  const files = migrationFiles();
  console.log(`Migrations to apply (${files.length}):`);
  for (const f of files) console.log('  -', f);
  if (!withSeed) console.log(`  (skipping ${SEED_FILE} — production starts clean)`);
  console.log();

  if (dryRun) {
    console.log('--dry-run: nothing executed');
    return;
  }

  // Render requires TLS but serves a cert chain Node does not trust by default.
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const done = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
    );

    for (const file of files) {
      if (done.has(file)) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`apply ${file} ... `);

      // Each file is one transaction: a failure halfway leaves no partial schema.
      // The whole file goes in a single query — splitting on semicolons would
      // break function bodies delimited by $$.
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        console.error(`\n  ${err.message}\n`);
        throw err;
      }
    }

    const tables = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    console.log(`\nTables now present (${tables.rows.length}):`);
    console.log('  ' + tables.rows.map((r) => r.tablename).join(', '));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('migration failed:', err.message);
  process.exit(1);
});
