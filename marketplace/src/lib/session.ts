import { query } from '@/lib/db';

export async function getSessionUserId(cookie: string): Promise<string | null> {
  const match = cookie.match(/valueskins_session=([^;]+)/);
  if (!match) return null;

  const sessionToken = match[1];

  const result = await query(
    `SELECT user_id FROM auth_sessions
     WHERE id = $1 AND is_active = true AND expires_at > NOW()`,
    [sessionToken]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].user_id;
}

export async function getAccountId(cookie: string): Promise<string | null> {
  const userId = await getSessionUserId(cookie);
  if (!userId) return null;

  await query(
    'INSERT INTO accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );

  return userId;
}

export async function getUserDisplay(userId: string): Promise<string> {
  const result = await query(
    'SELECT display_name, username FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return 'User';
  return result.rows[0].display_name || result.rows[0].username || 'User';
}
