import { query } from '@/lib/db-pool';

export async function sendPushNotification(userId: number, title: string, body: string, url?: string) {
  const subs = await query(
    'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0, total: subs.rows.length, note: 'VAPID keys not configured' };
  }

  let sent = 0;
  for (const sub of subs.rows) {
    try {
      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '86400',
        },
        body: JSON.stringify({
          title,
          body,
          url: url || '/',
        }),
      });
      if (res.ok) sent++;
    } catch {
      // subscription expired - remove it
      await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
    }
  }

  return { sent, total: subs.rows.length };
}
