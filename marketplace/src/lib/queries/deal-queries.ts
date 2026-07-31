/**
 * Deal Queries - Read Path
 * All read operations for deals, negotiations, contracts
 */

import { PostgresEventStore } from '../events/postgres-event-store';
import { AggregateRoot } from '../events/core';

const eventStore = new PostgresEventStore();

// ============================================================================
// GET DEAL WITH FULL NEGOTIATION HISTORY
// ============================================================================

export async function getDealWithHistory(deal_id: string) {
  const events = await eventStore.getByAggregateId(deal_id, 'deal');

  if (!events || events.length === 0) {
    throw new Error(`Deal not found: ${deal_id}`);
  }

  let dealState = {
    deal_id,
    status: 'negotiation_pending',
    offers: [] as any[],
    counter_offers: [] as any[],
    contract_id: null as string | null,
    contract_status: 'unsigned',
    final_terms: {} as any,
    negotiation_history: [] as any[],
    completed_at: null as string | null,
  };

  events.forEach((event) => {
    switch (event.event_type) {
      case 'offer_submitted':
        dealState.offers.push({
          offer_id: event.data.offer_id,
          submitted_by: event.data.submitted_by,
          deliverables: event.data.deliverables,
          price: event.data.price,
          currency: event.data.currency,
          terms: event.data.terms,
          submitted_at: event.data.submitted_at,
        });
        dealState.negotiation_history.push({
          event_type: 'offer_submitted',
          actor: event.actor_id,
          timestamp: event.occurred_at,
        });
        break;

      case 'counter_offer_submitted':
        dealState.counter_offers.push({
          counter_offer_id: event.data.counter_offer_id,
          submitted_by: event.data.submitted_by,
          changes: event.data.changes,
          submitted_at: event.data.submitted_at,
        });
        dealState.negotiation_history.push({
          event_type: 'counter_offer_submitted',
          actor: event.actor_id,
          timestamp: event.occurred_at,
        });
        break;

      case 'negotiation_accepted':
        dealState.final_terms = dealState.offers.find((o) => o.offer_id === event.data.final_offer_id) || {};
        dealState.status = 'offer_accepted';
        dealState.negotiation_history.push({
          event_type: 'negotiation_accepted',
          actor: event.actor_id,
          timestamp: event.occurred_at,
        });
        break;

      case 'contract_generated':
        dealState.contract_id = event.data.contract_id;
        dealState.status = 'contract_pending';
        break;

      case 'contract_signed':
        dealState.contract_status = 'signed';
        dealState.status = 'contract_signed';
        break;

      case 'deal_completed':
        dealState.status = 'completed';
        dealState.completed_at = event.data.completed_at;
        break;

      case 'deal_cancelled':
        dealState.status = 'cancelled';
        break;
    }
  });

  return dealState;
}

// ============================================================================
// GET DEALS FOR BRAND
// ============================================================================

export async function getDealsForBrand(brand_id: string) {
  const query = `
    SELECT DISTINCT
      e.aggregate_id as deal_id,
      (e.data->>'brand_id') as brand_id,
      (e.data->>'creator_id') as creator_id,
      (e.data->>'campaign_id') as campaign_id,
      e.event_type,
      e.occurred_at
    FROM events_log e
    WHERE e.aggregate_type = 'deal'
      AND e.data->>'brand_id' = $1
    ORDER BY e.occurred_at DESC
  `;

  const result = await eventStore['pool'].query(query, [brand_id]);

  const dealsMap = new Map<string, any>();
  result.rows.forEach((row) => {
    if (!dealsMap.has(row.deal_id)) {
      dealsMap.set(row.deal_id, {
        deal_id: row.deal_id,
        brand_id: row.brand_id,
        creator_id: row.creator_id,
        campaign_id: row.campaign_id,
        last_event: row.event_type,
        last_updated: row.occurred_at,
      });
    }
  });

  return Array.from(dealsMap.values());
}

// ============================================================================
// GET DEALS FOR CREATOR
// ============================================================================

export async function getDealsForCreator(creator_id: string) {
  const query = `
    SELECT DISTINCT
      e.aggregate_id as deal_id,
      (e.data->>'brand_id') as brand_id,
      (e.data->>'creator_id') as creator_id,
      (e.data->>'campaign_id') as campaign_id,
      e.event_type,
      e.occurred_at
    FROM events_log e
    WHERE e.aggregate_type = 'deal'
      AND e.data->>'creator_id' = $1
    ORDER BY e.occurred_at DESC
  `;

  const result = await eventStore['pool'].query(query, [creator_id]);

  const dealsMap = new Map<string, any>();
  result.rows.forEach((row) => {
    if (!dealsMap.has(row.deal_id)) {
      dealsMap.set(row.deal_id, {
        deal_id: row.deal_id,
        brand_id: row.brand_id,
        creator_id: row.creator_id,
        campaign_id: row.campaign_id,
        last_event: row.event_type,
        last_updated: row.occurred_at,
      });
    }
  });

  return Array.from(dealsMap.values());
}

// ============================================================================
// GET DEAL NEGOTIATION STATUS
// ============================================================================

export async function getDealNegotiationStatus(deal_id: string) {
  const events = await eventStore.getByAggregateId(deal_id, 'deal');

  const status = {
    deal_id,
    current_step: 'unknown',
    offers_submitted: 0,
    counter_offers_submitted: 0,
    is_negotiation_active: true,
    last_update: new Date().toISOString(),
  };

  if (!events || events.length === 0) {
    return status;
  }

  events.forEach((event) => {
    switch (event.event_type) {
      case 'offer_submitted':
        status.offers_submitted++;
        status.current_step = 'offer_submitted';
        break;
      case 'counter_offer_submitted':
        status.counter_offers_submitted++;
        status.current_step = 'counter_offer_submitted';
        break;
      case 'negotiation_accepted':
        status.current_step = 'negotiation_accepted';
        status.is_negotiation_active = false;
        break;
      case 'deal_cancelled':
        status.current_step = 'cancelled';
        status.is_negotiation_active = false;
        break;
    }
    status.last_update = event.occurred_at;
  });

  return status;
}
