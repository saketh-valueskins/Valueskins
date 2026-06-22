import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await query(`CREATE TABLE IF NOT EXISTS deal_milestones (
    id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS deliverable_reviews (
    id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES deal_milestones(id) ON DELETE SET NULL,
    file_name VARCHAR(500) NOT NULL DEFAULT '',
    file_url TEXT NOT NULL DEFAULT '',
    file_type VARCHAR(100) DEFAULT '',
    file_size BIGINT DEFAULT 0,
    comment TEXT DEFAULT '',
    reviewer_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS review_comments (
    id SERIAL PRIMARY KEY,
    deliverable_id INTEGER NOT NULL REFERENCES deliverable_reviews(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query('CREATE INDEX IF NOT EXISTS idx_milestones_deal ON deal_milestones(deal_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_deliverable_reviews_deal ON deliverable_reviews(deal_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_review_comments_deliverable ON review_comments(deliverable_id)');
  schemaReady = true;
}

const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/quicktime', 'text/plain'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await ensureSchema();

  const { action, dealId: rawDealId } = req.query;
  const dealId = rawDealId ? parseInt(rawDealId as string) : null;
  if (!dealId) return res.status(400).json({ error: 'dealId required' });

  const isParticipant = await query(
    'SELECT id FROM deals WHERE id = $1 AND (brand_id = $2 OR creator_id = $2)', [dealId, userId]);
  if (!isParticipant.rows[0]) return res.status(403).json({ error: 'Not part of this deal' });

  try {
    if (action === 'milestones-get' && req.method === 'GET') {
      const r = await query('SELECT * FROM deal_milestones WHERE deal_id = $1 ORDER BY created_at', [dealId]);
      return res.json({ milestones: r.rows });
    }

    if (action === 'milestones-create' && req.method === 'POST') {
      const { milestones } = req.body;
      if (!Array.isArray(milestones) || milestones.length === 0) return res.status(400).json({ error: 'milestones array required' });
      if (milestones.length > 20) return res.status(400).json({ error: 'Max 20 milestones' });

      for (const m of milestones) {
        if (!m.title || m.title.length > 200) return res.status(400).json({ error: 'Each milestone needs a title (max 200 chars)' });
        await query('INSERT INTO deal_milestones (deal_id, title, description, due_date) VALUES ($1,$2,$3,$4)',
          [dealId, m.title, m.description || '', m.due_date ? new Date(m.due_date) : null]);
      }
      return res.status(201).json({ message: `${milestones.length} milestones created` });
    }

    if (action === 'milestone-update' && req.method === 'PATCH') {
      const { milestoneId, status } = req.body;
      if (!milestoneId || !status) return res.status(400).json({ error: 'milestoneId and status required' });
      if (!['pending', 'in_progress', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

      const sets = status === 'completed' ? `status = $1, completed_at = NOW()` : `status = $1`;
      await query(`UPDATE deal_milestones SET ${sets}, updated_at = NOW() WHERE id = $2 AND deal_id = $3`,
        [status, milestoneId, dealId]);
      return res.json({ message: 'Milestone updated' });
    }

    if (action === 'submit-deliverable' && req.method === 'POST') {
      const { milestoneId, fileName, fileUrl, fileType, fileSize } = req.body;
      if (!fileUrl || !fileName) return res.status(400).json({ error: 'fileUrl and fileName required' });

      if (fileType && !VALID_FILE_TYPES.includes(fileType)) {
        return res.status(400).json({ error: `Invalid file type: ${fileType}. Allowed: ${VALID_FILE_TYPES.join(', ')}` });
      }
      if (fileSize && fileSize > 100 * 1024 * 1024) return res.status(400).json({ error: 'File too large. Max 100MB' });

      const r = await query(`INSERT INTO deliverable_reviews (deal_id, milestone_id, file_name, file_url, file_type, file_size, reviewer_id, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted') RETURNING *`,
        [dealId, milestoneId || null, fileName, fileUrl, fileType || '', fileSize || 0, userId]);
      return res.status(201).json({ deliverable: r.rows[0] });
    }

    if (action === 'deliverables-get' && req.method === 'GET') {
      const r = await query(`
        SELECT dr.*, json_agg(json_build_object('id', rc.id, 'author_id', rc.author_id, 'comment', rc.comment, 'created_at', rc.created_at)) as comments
        FROM deliverable_reviews dr LEFT JOIN review_comments rc ON dr.id = rc.deliverable_id
        WHERE dr.deal_id = $1 GROUP BY dr.id ORDER BY dr.created_at DESC`, [dealId]);
      return res.json({ deliverables: r.rows });
    }

    if (action === 'add-comment' && req.method === 'POST') {
      const { deliverableId, comment } = req.body;
      if (!deliverableId || !comment || comment.trim().length === 0 || comment.length > 2000) return res.status(400).json({ error: 'Invalid comment (max 2000 chars)' });

      const r = await query('INSERT INTO review_comments (deliverable_id, author_id, comment) VALUES ($1,$2,$3) RETURNING *',
        [deliverableId, userId, comment.trim()]);
      return res.status(201).json({ comment: r.rows[0] });
    }

    if (action === 'approve-deliverable' && req.method === 'POST') {
      const { deliverableId } = req.body;
      if (!deliverableId) return res.status(400).json({ error: 'deliverableId required' });

      const del = await query('SELECT * FROM deliverable_reviews WHERE id = $1 AND deal_id = $2', [deliverableId, dealId]);
      if (!del.rows[0]) return res.status(404).json({ error: 'Deliverable not found' });

      await query(`UPDATE deliverable_reviews SET status = 'approved' WHERE id = $1`, [deliverableId]);
      return res.json({ message: 'Approved' });
    }

    if (action === 'reject-deliverable' && req.method === 'POST') {
      const { deliverableId } = req.body;
      if (!deliverableId) return res.status(400).json({ error: 'deliverableId required' });

      const del = await query('SELECT * FROM deliverable_reviews WHERE id = $1 AND deal_id = $2', [deliverableId, dealId]);
      if (!del.rows[0]) return res.status(404).json({ error: 'Deliverable not found' });

      await query(`UPDATE deliverable_reviews SET status = 'rejected' WHERE id = $1`, [deliverableId]);
      return res.json({ message: 'Rejected' });
    }

    return res.status(405).json({ error: 'Action not found' });
  } catch (err: any) {
    console.error('Milestones error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
