/**
 * View Projections
 * Denormalized read models for fast queries
 */

import { DomainEvent } from '@/lib/events/core';
import { projectCampaignEvent, ensureCampaignViewTable } from './campaign-projection';
import { projectDealEvent, ensureDealViewTable } from './deal-projection';

export async function projectEvent(event: DomainEvent): Promise<void> {
  // Route event to appropriate projector
  if (event.aggregate_type === 'campaign') {
    await projectCampaignEvent(event);
  } else if (event.aggregate_type === 'deal') {
    await projectDealEvent(event);
  }
  // Add more aggregate types as needed
}

export async function ensureViewTables(): Promise<void> {
  await Promise.all([
    ensureCampaignViewTable(),
    ensureDealViewTable(),
  ]);
}

export { projectCampaignEvent, projectDealEvent };
