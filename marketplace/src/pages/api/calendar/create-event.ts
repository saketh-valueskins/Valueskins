import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getValidGoogleAccessToken } from '@/lib/google-calendar';

async function createGoogleCalendarEvent(
  accessToken: string,
  dealData: any
): Promise<string | null> {
  try {
    const eventTitle = dealData.title || `Deal with ${dealData.brand_name || 'Brand'}`;

    const eventBody = {
      summary: eventTitle,
      description: `ValueSkins Deal\n\nBrand: ${dealData.brand_name}\nCompensation: ${dealData.agreed_amount}\n\nDeliverables:\n${dealData.deliverables || 'TBA'}\n\nDeal Link: https://valueskins.com/deals/${dealData.id}`,
      location: dealData.location || '',
      start: {
        dateTime: dealData.shoot_date ? new Date(dealData.shoot_date).toISOString() : new Date().toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: dealData.shoot_time
          ? calculateEndTime(dealData.shoot_date, dealData.shoot_time)
          : new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 1 day before
          { method: 'notification', minutes: 60 }, // 1 hour before
        ],
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!response.ok) {
      console.error('Google Calendar API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (err) {
    console.error('Error creating Google Calendar event:', err);
    return null;
  }
}

function calculateEndTime(shootDate: string, shootTime: string): string {
  if (!shootTime) {
    return new Date(new Date(shootDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

  // Parse shoot_time format: "15:00-17:00" or "3:00 PM - 5:00 PM"
  const timeMatch = shootTime.match(/(\d{1,2}):(\d{2})\s*(?:AM|PM|-|–)/i);
  if (!timeMatch) {
    return new Date(new Date(shootDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  if (shootTime.includes('PM') && hours !== 12) hours += 12;
  if (shootTime.includes('AM') && hours === 12) hours = 0;

  const endDate = new Date(shootDate);
  endDate.setHours(hours + 2, minutes, 0, 0);

  return endDate.toISOString();
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const sessionResult = await query(
      'SELECT account_id FROM sessions WHERE session_token = $1',
      [sessionToken]
    );
    if (!sessionResult.rows[0]) return res.status(401).json({ error: 'Invalid session' });

    const userId = sessionResult.rows[0].account_id;
    const { dealId } = req.body;

    if (!dealId) return res.status(400).json({ error: 'dealId required' });

    // Get user's Google access token (with auto-refresh if needed)
    const accessToken = await getValidGoogleAccessToken(userId);

    if (!accessToken) {
      return res.status(400).json({ error: 'Google Calendar not connected. Please link your Google account.' });
    }

    // Get deal details
    const dealResult = await query(
      `SELECT id, title, brand_name, agreed_amount, shoot_date, shoot_time, location,
              submission_deadline, approval_deadline, posting_deadline, payment_due_date,
              requires_shoot_on_location, phase
       FROM deals
       WHERE id = $1 AND (creator_id = $2 OR brand_id = $2)`,
      [dealId, userId]
    );

    if (!dealResult.rows[0]) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealResult.rows[0];

    if (!deal.requires_shoot_on_location) {
      return res.status(400).json({ error: 'This deal does not require a location-based shoot' });
    }

    if (!['accepted', 'softhold', 'checklist', 'approved'].includes(deal.phase)) {
      return res.status(400).json({ error: 'Deal must be accepted to add to calendar' });
    }

    // Create the calendar event
    const eventId = await createGoogleCalendarEvent(accessToken, deal);

    if (!eventId) {
      return res.status(500).json({ error: 'Failed to create calendar event. Please check your Google Calendar connection.' });
    }

    // Store event ID in database for future reference
    await query(
      'UPDATE deals SET google_calendar_event_id = $1, calendar_synced_at = NOW() WHERE id = $2',
      [eventId, dealId]
    );

    return res.status(200).json({
      success: true,
      eventId,
      message: 'Event added to your Google Calendar',
    });
  } catch (err: any) {
    console.error('Calendar create-event API error:', err);
    return res.status(500).json({ error: 'Failed to create calendar event' });
  }
}

export default handler;
