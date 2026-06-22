import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await query(`CREATE TABLE IF NOT EXISTS briefs (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    campaign_goals TEXT DEFAULT '',
    target_audience VARCHAR(200) DEFAULT '',
    budget_range VARCHAR(100) DEFAULT '',
    required_niches TEXT[] DEFAULT '{}',
    required_platforms TEXT[] DEFAULT '{}',
    required_content_types TEXT[] DEFAULT '{}',
    deadline TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await query('CREATE INDEX IF NOT EXISTS idx_briefs_brand ON briefs(brand_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_briefs_active ON briefs(is_active)');
  schemaReady = true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const briefId = req.query.id ? parseInt(req.query.id as string) : null;
      if (briefId) {
        const r = await query('SELECT * FROM briefs WHERE id = $1 AND brand_id = $2', [briefId, userId]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Brief not found' });
        return res.json({ brief: r.rows[0] });
      }
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize as string) || 20), 100);
      const offset = (page - 1) * pageSize;
      const countResult = await query('SELECT COUNT(*) as total FROM briefs WHERE brand_id = $1', [userId]);
      const total = parseInt(countResult.rows[0]?.total || '0');
      const r = await query('SELECT * FROM briefs WHERE brand_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, pageSize, offset]);
      return res.json({
        briefs: r.rows,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total },
      });
    }

    if (req.method === 'POST') {
      const { title, description, campaign_goals, target_audience, budget_range, required_niches, required_platforms, required_content_types, deadline } = req.body;
      if (!title || title.trim().length < 3) return res.status(400).json({ error: 'Title must be at least 3 characters' });
      if (title.length > 200) return res.status(400).json({ error: 'Title max 200 characters' });
      if (!description || description.trim().length < 20) return res.status(400).json({ error: 'Description must be at least 20 characters' });

      const r = await query(`INSERT INTO briefs (brand_id, title, description, campaign_goals, target_audience, budget_range, required_niches, required_platforms, required_content_types, deadline)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [userId, title.trim(), description.trim(), campaign_goals || '', target_audience || '', budget_range || '',
         required_niches || [], required_platforms || [], required_content_types || [],
         deadline ? new Date(deadline) : null]);
      return res.status(201).json({ brief: r.rows[0] });
    }

    if (req.method === 'PATCH') {
      const { id, title, description, campaign_goals, target_audience, budget_range, required_niches, required_platforms, required_content_types, deadline, is_active } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const fields: string[] = [];
      const params: any[] = [];
      let p = 1;

      if (title !== undefined) { fields.push(`title = $${p++}`); params.push(title); }
      if (description !== undefined) { fields.push(`description = $${p++}`); params.push(description); }
      if (campaign_goals !== undefined) { fields.push(`campaign_goals = $${p++}`); params.push(campaign_goals); }
      if (target_audience !== undefined) { fields.push(`target_audience = $${p++}`); params.push(target_audience); }
      if (budget_range !== undefined) { fields.push(`budget_range = $${p++}`); params.push(budget_range); }
      if (required_niches !== undefined) { fields.push(`required_niches = $${p++}`); params.push(required_niches); }
      if (required_platforms !== undefined) { fields.push(`required_platforms = $${p++}`); params.push(required_platforms); }
      if (required_content_types !== undefined) { fields.push(`required_content_types = $${p++}`); params.push(required_content_types); }
      if (deadline !== undefined) { fields.push(`deadline = $${p++}`); params.push(deadline ? new Date(deadline) : null); }
      if (is_active !== undefined) { fields.push(`is_active = $${p++}`); params.push(is_active); }

      if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
      fields.push(`updated_at = NOW()`);
      params.push(id, userId);

      const r = await query(`UPDATE briefs SET ${fields.join(', ')} WHERE id = $${p++} AND brand_id = $${p++} RETURNING *`, params);
      if (!r.rows[0]) return res.status(404).json({ error: 'Brief not found' });
      return res.json({ brief: r.rows[0] });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id ? parseInt(req.query.id as string) : null;
      if (!id) return res.status(400).json({ error: 'id required' });
      await query('DELETE FROM briefs WHERE id = $1 AND brand_id = $2', [id, userId]);
      return res.json({ message: 'Deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Briefs error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
