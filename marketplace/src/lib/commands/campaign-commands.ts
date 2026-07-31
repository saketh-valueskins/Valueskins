/**
 * Campaign Commands - Write Path
 * Every command creates events (what actually happened)
 * Never update state directly - ONLY emit events
 */

import { v4 as uuid } from 'uuid';
import { EventBuilder } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';
import { getDispatcher } from '../events/setup';
import {
  CampaignCreatedEvent,
  CampaignPublishedEvent,
  CampaignInvitationSentEvent,
  CreatorAcceptedInvitationEvent,
  CampaignClosedEvent,
} from '../events/domain-events';

const eventStore = new PostgresEventStore();

// ============================================================================
// CREATE CAMPAIGN COMMAND
// ============================================================================

export interface CreateCampaignCommand {
  brand_id: string;
  user_id: string; // authenticated user
  title: string;
  description: string;
  target_valueSkins: ('Type1' | 'Type2' | 'Type3')[];
  budget: number;
  deadline: string; // ISO8601
  location?: string;
  requirements?: string;
}

export async function handleCreateCampaignCommand(
  command: CreateCampaignCommand
): Promise<{ campaign_id: string }> {
  // Validation
  if (!command.title?.trim()) {
    throw new Error('Campaign title is required');
  }
  if (!command.description?.trim()) {
    throw new Error('Campaign description is required');
  }
  if (command.budget <= 0) {
    throw new Error('Budget must be greater than 0');
  }
  if (new Date(command.deadline) <= new Date()) {
    throw new Error('Deadline must be in the future');
  }
  if (command.target_valueSkins.length === 0) {
    throw new Error('At least one target ValueSkin is required');
  }

  // Authorization
  if (command.user_id !== command.brand_id) {
    throw new Error('Only brand can create campaign');
  }

  // Create event
  const campaign_id = uuid();
  const idempotency_key = `campaign:create:${command.brand_id}:${command.title}:${command.deadline}`;

  // Check idempotency
  const isDuplicate = await eventStore.isIdempotent(idempotency_key);
  if (isDuplicate) {
    // Return existing campaign (idempotent response)
    const events = await eventStore.getByActorId(command.user_id);
    const existing = events.find(
      e =>
        e.event_type === 'campaign_created' &&
        e.data.title === command.title
    );
    if (existing) {
      return { campaign_id: existing.aggregate_id };
    }
  }

  // Build event
  const event = new EventBuilder(
    'campaign_created',
    campaign_id,
    'campaign',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      campaign_id,
      brand_id: command.brand_id,
      title: command.title,
      description: command.description,
      target_valueSkins: command.target_valueSkins,
      budget: command.budget,
      currency: 'INR',
      deadline: command.deadline,
      location: command.location,
      requirements: command.requirements,
    })
    .withMetadata({
      user_agent: process.env.USER_AGENT || 'unknown',
      ip_address: process.env.CLIENT_IP || '0.0.0.0',
    })
    .build() as CampaignCreatedEvent;

  // Persist event
  await eventStore.append([event]);

  // Dispatch to subscribers (projections, broadcaster, logging)
  await getDispatcher().dispatch(event);

  return { campaign_id };
}

// ============================================================================
// PUBLISH CAMPAIGN COMMAND
// ============================================================================

export interface PublishCampaignCommand {
  campaign_id: string;
  brand_id: string;
  user_id: string;
}

export async function handlePublishCampaignCommand(
  command: PublishCampaignCommand
): Promise<{ eligible_creators_count: number }> {
  // Load campaign state
  const events = await eventStore.getByAggregateId(command.campaign_id);

  if (events.length === 0) {
    throw new Error('Campaign not found');
  }

  // Check campaign status is 'draft'
  const campaign_created = events.find(e => e.event_type === 'campaign_created');
  if (!campaign_created) {
    throw new Error('Campaign not properly initialized');
  }

  if (campaign_created.data.brand_id !== command.brand_id) {
    throw new Error('Only campaign owner can publish');
  }

  // Check if already published
  const already_published = events.find(
    e => e.event_type === 'campaign_published'
  );
  if (already_published) {
    return { eligible_creators_count: already_published.data.eligible_creators_count };
  }

  // Calculate eligible creators (would query creators table)
  // For now: mock implementation
  const eligible_creators_count = 42;

  // Create event
  const idempotency_key = `campaign:publish:${command.campaign_id}`;

  const event = new EventBuilder(
    'campaign_published',
    command.campaign_id,
    'campaign',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      campaign_id: command.campaign_id,
      brand_id: command.brand_id,
      eligible_creators_count,
    })
    .build() as CampaignPublishedEvent;

  // Persist
  await eventStore.append([event]);

  // Dispatch
  await getDispatcher().dispatch(event);

  // TODO: Queue background job to generate invitations

  return { eligible_creators_count };
}

// ============================================================================
// ACCEPT INVITATION COMMAND
// ============================================================================

export interface AcceptInvitationCommand {
  invitation_id: string;
  campaign_id: string;
  creator_id: string;
  user_id: string;
}

export async function handleAcceptInvitationCommand(
  command: AcceptInvitationCommand
): Promise<{ deal_id: string }> {
  // Authorization
  if (command.user_id !== command.creator_id) {
    throw new Error('Only creator can accept invitation');
  }

  // Check invitation exists
  const events = await eventStore.getByAggregateId(command.campaign_id);
  const invitation_sent = events.find(
    e =>
      e.event_type === 'campaign_invitation_sent' &&
      e.data.creator_id === command.creator_id
  );

  if (!invitation_sent) {
    throw new Error('Invitation not found');
  }

  // Create deal
  const deal_id = uuid();
  const idempotency_key = `invitation:accept:${command.invitation_id}`;

  const event = new EventBuilder(
    'creator_accepted_invitation',
    deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      invitation_id: command.invitation_id,
      campaign_id: command.campaign_id,
      creator_id: command.creator_id,
      deal_id,
      accepted_at: new Date().toISOString(),
    })
    .build() as CreatorAcceptedInvitationEvent;

  // Persist
  await eventStore.append([event]);

  // Dispatch
  await getDispatcher().dispatch(event);

  // TODO: Create subscriptions for both brand and creator to deal channels

  return { deal_id };
}

// ============================================================================
// CLOSE CAMPAIGN COMMAND
// ============================================================================

export interface CloseCampaignCommand {
  campaign_id: string;
  brand_id: string;
  user_id: string;
  reason: 'completed' | 'cancelled' | 'expired';
}

export async function handleCloseCampaignCommand(
  command: CloseCampaignCommand
): Promise<void> {
  // Authorization
  const events = await eventStore.getByAggregateId(command.campaign_id);
  const campaign_created = events.find(e => e.event_type === 'campaign_created');

  if (campaign_created?.data.brand_id !== command.brand_id) {
    throw new Error('Only campaign owner can close campaign');
  }

  // Check not already closed
  const already_closed = events.find(e => e.event_type === 'campaign_closed');
  if (already_closed) {
    return; // Idempotent - already closed
  }

  // Create event
  const idempotency_key = `campaign:close:${command.campaign_id}:${command.reason}`;

  const event = new EventBuilder(
    'campaign_closed',
    command.campaign_id,
    'campaign',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      campaign_id: command.campaign_id,
      brand_id: command.brand_id,
      reason: command.reason,
      closed_at: new Date().toISOString(),
    })
    .build() as CampaignClosedEvent;

  // Persist
  await eventStore.append([event]);

  // Dispatch
  await getDispatcher().dispatch(event);
}
