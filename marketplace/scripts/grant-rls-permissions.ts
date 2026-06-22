import { Pool } from 'pg';
import dns from 'dns';

async function main() {
  const rawUrl = process.env.DATABASE_URL || '';
  const parsed = new URL(rawUrl);
  const host = parsed.hostname;
  const port = parseInt(parsed.port || '5432');
  const database = parsed.pathname.replace(/^\//, '');
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  try {
    const addrs = await dns.promises.resolve6(host);
    if (addrs.length > 0) {
      const pool = new Pool({ host: addrs[0], port, database, user, password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
      await run(pool);
      await pool.end();
      return;
    }
  } catch {}
  const pool = new Pool({ host, port, database, user, password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  await run(pool);
  await pool.end();
}

async function run(pool: Pool) {
  const sql = `
BEGIN;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_anon_select ON public.users;
DROP POLICY IF EXISTS users_anon_insert ON public.users;
DROP POLICY IF EXISTS users_anon_update ON public.users;
CREATE POLICY users_anon_select ON public.users FOR SELECT USING (true);
CREATE POLICY users_anon_insert ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY users_anon_update ON public.users FOR UPDATE USING (true);

-- Auth sessions table
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_sessions_anon_select ON public.auth_sessions;
DROP POLICY IF EXISTS auth_sessions_anon_insert ON public.auth_sessions;
CREATE POLICY auth_sessions_anon_select ON public.auth_sessions FOR SELECT USING (true);
CREATE POLICY auth_sessions_anon_insert ON public.auth_sessions FOR INSERT WITH CHECK (true);

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
  `.trim();

  console.log('Running RLS grant migration...');
  await pool.query(sql);
  console.log('Done! RLS policies created for anon role.');
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
