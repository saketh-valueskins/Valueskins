/**
 * Deal View Projection
 */

import { getPool } from '@/lib/db/pool';
import { DomainEvent } from '@/lib/events/core';

export async function projectDealEvent(event: DomainEvent): Promise<void> {
  const pool = getPool();
  const { aggregate_id: deal_id, data } = event;

  try {
    switch (event.event_type) {
      case 'creator_accepted_invitation':
        await pool.query(
          `INSERT INTO deals_view
           (id, brand_id, creator_id, campaign_id, status, created_at)
           VALUES ($1, $2, $3, $4, 'negotiation_pending', NOW())
           ON CONFLICT (id) DO NOTHING`,
          [deal_id, data.brand_id, data.creator_id, data.campaign_id]
        );
        break;

      case 'negotiation_accepted':
        await pool.query(
          `UPDATE deals_view
           SET status = 'offer_accepted'
           WHERE id = $1`,
          [deal_id]
        );
        break;

      case 'contract_signed':
        await pool.query(
          `UPDATE deals_view
           SET status = 'contract_signed'
           WHERE id = $1`,
          [deal_id]
        );
        break;

      case 'deal_completed':
        await pool.query(
          `UPDATE deals_view
           SET status = 'completed', completed_at = $1
           WHERE id = $2`,
          [data.completed_at, deal_id]
        );
        break;

      case 'deal_cancelled':
        await pool.query(
          `UPDATE deals_view
           SET status = 'cancelled'
           WHERE id = $1`,
          [deal_id]
        );
        break;
    }
  } catch (error) {
    console.error('Deal projection error:', error);
    throw error;
  }
}

export async function ensureDealViewTable(): Promise<void> {
  const pool = getPool();

  await pool.query(
    `CREATE TABLE IF NOT EXISTS deals_view (
      id UUID PRIMARY KEY,
      brand_id UUID NOT NULL,
      creator_id UUID NOT NULL,
      campaign_id UUID,
      status VARCHAR(50) DEFAULT 'negotiation_pending',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    )`
  );
}
