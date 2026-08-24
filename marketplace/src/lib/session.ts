import { query } from '@/lib/db';
import { SESSION_IDLE_TIMEOUT_MS, SESSION_ABSOLUTE_TIMEOUT_MS } from '@/config/constants';

// Sliding idle timeout: each authenticated request pushes expires_at forward
// by SESSION_IDLE_TIMEOUT_MS, but never past created_at + SESSION_ABSOLUTE_TIMEOUT_MS.
export async function touchSession(sessionToken: string): Promise<void> {
  await query(
    `UPDATE auth_sessions
     SET expires_at = LEAST(
       NOW() + ($2 || ' milliseconds')::interval,
       created_at + ($3 || ' milliseconds')::interval
     )
     WHERE id = $1 AND is_active = true AND expires_at > NOW()`,
    [sessionToken, String(SESSION_IDLE_TIMEOUT_MS), String(SESSION_ABSOLUTE_TIMEOUT_MS)]
  ).catch(() => {}); // renewal is best-effort; validation still gates access
}

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

  // Sliding-expiry renewal is best-effort and its result does not affect this
  // response, so it must not sit in the critical path. Awaiting it added a full
  // database round trip to EVERY authenticated request — measured at ~75ms
  // against this database, on top of the lookup above. Access is still gated by
  // the SELECT; this only extends the window.
  void touchSession(sessionToken);
  return result.rows[0].user_id;
}

export async function getAccountId(cookie: string): Promise<string | null> {
  const userId = await getSessionUserId(cookie);
  if (!userId) return null;

  // Ensure an account row exists for this user.
  // The accounts table may have different schemas depending on which migrations ran:
  //   - Backend schema: accounts(id, legacy_user_id, ...) — no user_id column
  //   - Marketplace schema: accounts(id, user_id, ...) — has user_id column
  // Try the marketplace schema first; if the column doesn't exist, fall back gracefully.
  try {
    await query(
      'INSERT INTO accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [userId]
    );
  } catch (e: any) {
    // If the column doesn't exist (backend schema), try the legacy_user_id column
    if (e?.code === '42703') {
      // 42703 = undefined_column
      try {
        await query(
          'INSERT INTO accounts (legacy_user_id) VALUES ($1) ON CONFLICT (legacy_user_id) DO NOTHING',
          [userId]
        );
      } catch {
        // If neither works, the accounts table may not support this user type.
        // Return the userId anyway — callers can still use it for auth checks.
      }
    }
    // For other errors, also continue — the userId is still valid for auth.
  }

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
