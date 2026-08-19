/**
 * Campaign View Projection
 * Denormalized read model for fast queries
 */

import { getPool } from '@/lib/db/pool';
import { DomainEvent } from '@/lib/events/core';

export async function projectCampaignEvent(event: DomainEvent): Promise<void> {
  const pool = getPool();
  const { campaign_id, data } = event;

  try {
    switch (event.event_type) {
      case 'campaign_created':
        await pool.query(
          `INSERT INTO campaigns_view
           (id, brand_id, title, description, status, target_valueSkins, budget, deadline, location, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            campaign_id,
            data.brand_id,
            data.title,
            data.description,
            'draft',
            JSON.stringify(data.target_valueSkins),
            data.budget,
            data.deadline,
            data.location,
          ]
        );
        break;

      case 'campaign_published':
        await pool.query(
          `UPDATE campaigns_view
           SET status = 'published', published_at = NOW()
           WHERE id = $1`,
          [campaign_id]
        );
        break;

      case 'campaign_closed':
        await pool.query(
          `UPDATE campaigns_view
           SET status = 'closed', closed_at = $1
           WHERE id = $2`,
          [data.closed_at, campaign_id]
        );
        break;

      case 'invitation_sent':
        await pool.query(
          `UPDATE campaigns_view
           SET invitation_count = invitation_count + 1
           WHERE id = $1`,
          [campaign_id]
        );
        break;

      case 'creator_accepted_invitation':
        await pool.query(
          `UPDATE campaigns_view
           SET application_count = application_count + 1
           WHERE id = $1`,
          [data.campaign_id]
        );
        break;
    }
  } catch (error) {
    console.error('Campaign projection error:', error);
    throw error;
  }
}

export async function ensureCampaignViewTable(): Promise<void> {
  const pool = getPool();

  await pool.query(
    `CREATE TABLE IF NOT EXISTS campaigns_view (
      id UUID PRIMARY KEY,
      brand_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      target_valueSkins JSONB,
      budget DECIMAL(10, 2),
      deadline TIMESTAMP,
      location VARCHAR(100),
      invitation_count INT DEFAULT 0,
      application_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      published_at TIMESTAMP,
      closed_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  );
}
