// ── ValueSkin Sync: Keep all skin tables in sync ──
// On purchase, write to ALL tables so every read path sees the skin.
// Tables to sync: user_stickers (purchase record), user_value_skins (manage page), user_valueskins (profile)

import { query } from './db-pool';

export async function syncSkinPurchase(params: {
  userId: number | string;
  professionId: number | string;
  professionName: string;
  valueskinCode: string;
  tier: number;
  imageUrl?: string;
}) {
  const { userId, professionId, professionName, valueskinCode, tier, imageUrl } = params;
  const userIdStr = String(userId);

  // 1. Sync to user_value_skins (for the Manage page)
  await query(
    `INSERT INTO user_value_skins (user_id, value_skin, image_url, purchased_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, value_skin) DO NOTHING`,
    [userIdStr, professionName, imageUrl || null]
  ).catch(err => console.error('sync user_value_skins failed', err));

  // 2. Sync to user_valueskins (for profile display) if user doesn't have one
  const existing = await query(
    'SELECT id FROM user_valueskins WHERE user_id = $1 AND profession = $2 LIMIT 1',
    [userIdStr, professionName]
  ).catch(() => ({ rows: [] }));

  if (!existing.rows.length) {
    await query(
      `INSERT INTO user_valueskins (user_id, profession, slot, xp, level, about_me, pitch_text, pitch_video, is_default, created_at)
       VALUES ($1, $2, $3, 0, 1, '', '', '', FALSE, NOW())
       ON CONFLICT DO NOTHING`,
      [userIdStr, professionName, 0]
    ).catch(err => console.error('sync user_valueskins failed', err));
  }
}

export async function backfillMissingSkinRecords() {
  // Find user_stickers that don't have corresponding user_value_skins entries
  const missing = await query(
    `SELECT us.user_id, us.profession_id, us.valueskin_code, us.tier, p.name as profession_name
     FROM user_stickers us
     LEFT JOIN professions p ON us.profession_id = p.id
     LEFT JOIN user_value_skins uvs ON uvs.user_id = us.user_id
       AND uvs.value_skin = COALESCE(p.name, us.valueskin_code)
     WHERE uvs.id IS NULL
     LIMIT 500`
  ).catch(() => ({ rows: [] }));

  let count = 0;
  for (const row of missing.rows) {
    await syncSkinPurchase({
      userId: row.user_id,
      professionId: row.profession_id,
      professionName: row.profession_name || row.valueskin_code,
      valueskinCode: row.valueskin_code,
      tier: row.tier,
    });
    count++;
  }

  return count;
}
