import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { verifyAdminSession } from './login';
import { getDealPDFVersions } from '@/lib/firebase-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin session
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const sessionToken = match ? match[1] : '';

  const isValidSession = await verifyAdminSession(sessionToken);
  if (!isValidSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all open disputes for deals in progress/review/completed
    const result = await query(`
      SELECT
        dd.id,
        dd.deal_id,
        dd.raised_by,
        dd.reason,
        dd.description,
        dd.evidence_urls,
        dd.status,
        dd.created_at,
        d.phase,
        d.amount,
        d.title,
        u.display_name as raised_by_name
      FROM deal_disputes dd
      JOIN deals d ON dd.deal_id = d.id
      JOIN users u ON dd.raised_by = u.id
      WHERE dd.status IN ('open', 'under_review')
      AND d.phase IN ('in_progress', 'review', 'completed')
      ORDER BY dd.created_at DESC
      LIMIT 1000
    `);

    // Fetch PDF versions for each dispute
    const disputes = await Promise.all(
      (result.rows || []).map(async (dispute) => {
        try {
          const versions = await getDealPDFVersions(dispute.deal_id);
          return { ...dispute, pdf_versions: versions };
        } catch (err) {
          return { ...dispute, pdf_versions: [] };
        }
      })
    );

    return res.status(200).json({ disputes });
  } catch (err: any) {
    console.error('Error fetching disputes:', err);
    return res.status(500).json({ error: 'Failed to fetch disputes' });
  }
}
