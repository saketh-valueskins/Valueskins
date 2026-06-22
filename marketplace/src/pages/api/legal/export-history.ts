import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { queryOne, query } from '@/lib/db-pool';
import { hashSessionToken } from '@/lib/auth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rawToken = req.cookies.valueskins_session;
    if (!rawToken) return res.status(401).json({ error: 'Unauthorized' });

    const hashedToken = hashSessionToken(rawToken);
    const session = await queryOne(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()',
      [hashedToken]
    );
    if (!session) return res.status(401).json({ error: 'Session expired' });

    const userId = session.user_id;

    const user = await queryOne('SELECT id, email, display_name, avatar_url, created_at, last_login_at, role FROM users WHERE id = $1', [userId]);
    const deals = await query('SELECT id, status, created_at FROM deal_rooms WHERE brand_user_id = $1 OR creator_user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]);
    const msgCount = await queryOne('SELECT COUNT(*) as count FROM deal_room_messages WHERE sender_user_id = $1', [userId]);
    const sessions = await queryOne('SELECT COUNT(*) as count FROM auth_sessions WHERE user_id = $1', [userId]);

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();
    let y = height - 50;

    function wrap(text: string, maxWidth: number): string[] {
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (font.widthOfTextAtSize(test, 10) > maxWidth) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    function addLine(text: string, size = 10, bold = false, color = rgb(0, 0, 0)) {
      const f = bold ? fontBold : font;
      const lines = wrap(text, width - 80);
      for (const line of lines) {
        if (y < 50) {
          page = doc.addPage([612, 792]);
          y = height - 50;
        }
        page.drawText(line, { x: 40, y, size, font: f, color });
        y -= size + 4;
      }
    }

    function addDivider() {
      y -= 6;
      page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= 10;
    }

    addLine('ValueSkins - Account History Summary', 18, true, rgb(0.1, 0.1, 0.1));
    addLine(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 8, false, rgb(0.4, 0.4, 0.4));
    y -= 8;
    addDivider();

    addLine('Account Information', 14, true);
    addLine(`Display Name: ${user?.display_name || 'Not set'}`);
    addLine(`Email: ${user?.email || 'Not set'}`);
    addLine(`Role: ${user?.role || 'Not set'}`);
    addLine(`Account Created: ${user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}`);
    addLine(`Last Login: ${user?.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Unknown'}`);
    addDivider();

    addLine('Activity Summary', 14, true);
    addLine(`Total Deals: ${deals?.rows?.length || 0}`);
    addLine(`Total Messages Sent: ${msgCount?.count || 0}`);
    addLine(`Total Sessions: ${sessions?.count || 0}`);
    addDivider();

    if (deals?.rows?.length > 0) {
      addLine('Recent Deals', 14, true);
      for (const deal of deals.rows.slice(0, 20)) {
        addLine(`- Deal #${deal.id} | ${deal.status || 'Unknown'} | ${new Date(deal.created_at).toLocaleDateString()}`);
      }
      if (deals.rows.length > 20) {
        addLine(`... and ${deals.rows.length - 20} more deals`);
      }
      addDivider();
    }

    addLine('Data We Collected', 14, true);
    addLine('During your time on ValueSkins, the following categories of data were collected:');
    y -= 4;
    addLine('- Profile information (name, email, avatar, username)');
    addLine('- Creator or brand profile details');
    addLine('- Deal records, payment history, and transaction data');
    addLine('- Communications (deal room messages, notifications)');
    addLine('- Usage data (feature interactions, page views)');
    addLine('- Security data (login timestamps, session records)');
    addDivider();

    addLine('Retention & Deletion', 14, true);
    addLine('Profile data and most records will be deleted immediately upon account deletion.');
    addLine('Payment records are retained for 7 years to comply with tax regulations.');
    addLine('Usage analytics are retained anonymized for up to 90 days.');
    addLine('Backup copies may exist for up to 90 days after deletion.');
    addDivider();

    addLine('Thank you for being part of ValueSkins.', 12, true, rgb(0.3, 0.3, 0.3));

    const pdfBytes = await doc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="valueskins-history-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('History export error:', error);
    return res.status(500).json({ error: 'History export failed' });
  }
}

export default withApiHandler(handler, {
  allowedMethods: ['GET'],
  rateLimit: { maxRequests: 10, windowMs: 24 * 60 * 60 * 1000 },
});
