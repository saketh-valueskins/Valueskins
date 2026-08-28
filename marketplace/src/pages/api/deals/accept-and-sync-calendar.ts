import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getValidGoogleAccessToken } from '@/lib/google-calendar';

async function createGoogleCalendarEvent(
  accessToken: string,
  dealData: any
): Promise<string | null> {
  try {
    if (!dealData.requires_shoot_on_location || !dealData.shoot_date) {
      return null; // Skip calendar sync for non-location deals
    }

    const eventTitle = dealData.title || `Deal with ${dealData.brand_name || 'Brand'}`;

    const eventBody = {
      summary: eventTitle,
      description: `ValueSkins Deal\n\nBrand: ${dealData.brand_name}\nCompensation: ${dealData.agreed_amount}\n\nDeliverables:\n${dealData.deliverables || 'TBA'}\n\nDeal Link: https://valueskins.com/deals/${dealData.id}`,
      location: dealData.location || '',
      start: {
        dateTime: new Date(dealData.shoot_date).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: calculateEndTime(dealData.shoot_date, dealData.shoot_time),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'notification', minutes: 60 },
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
    console.error('Error creating calendar event:', err);
    return null;
  }
}

function calculateEndTime(shootDate: string, shootTime: string): string {
  if (!shootTime) {
    return new Date(new Date(shootDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Get deal details
    const dealResult = await query(
      `SELECT id, title, brand_name, agreed_amount, shoot_date, shoot_time, location,
              requires_shoot_on_location, phase, creator_id, brand_id
       FROM deals
       WHERE id = $1 AND (creator_id = $2 OR brand_id = $2)`,
      [dealId, userId]
    );

    if (!dealResult.rows[0]) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealResult.rows[0];

    // Update deal phase to accepted
    await query(
      'UPDATE deals SET phase = $1, updated_at = NOW() WHERE id = $2',
      ['accepted', dealId]
    );

    // Try to sync to Google Calendar (for creator only)
    let calendarEventId = null;
    let calendarError = null;

    if (deal.requires_shoot_on_location && deal.creator_id) {
      const accessToken = await getValidGoogleAccessToken(deal.creator_id);

      if (accessToken) {
        calendarEventId = await createGoogleCalendarEvent(accessToken, deal);

        if (calendarEventId) {
          // Store event ID in database
          await query(
            'UPDATE deals SET google_calendar_event_id = $1, calendar_synced_at = NOW() WHERE id = $2',
            [calendarEventId, dealId]
          );
        }
      } else {
        calendarError = 'Google Calendar not connected. Creator can sync manually later.';
      }
    }

    return res.status(200).json({
      success: true,
      dealId,
      calendarEventId,
      calendarError,
      message: calendarEventId
        ? 'Deal accepted and synced to Google Calendar'
        : 'Deal accepted. Calendar sync pending or not applicable.',
    });
  } catch (err: any) {
    console.error('Accept and sync API error:', err);
    return res.status(500).json({ error: 'Failed to accept deal' });
  }
}
