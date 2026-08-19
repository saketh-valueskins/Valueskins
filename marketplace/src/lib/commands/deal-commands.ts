/**
 * Deal Commands - Write Path
 * Negotiation, contract, completion lifecycle
 */

import { v4 as uuid } from 'uuid';
import { EventBuilder } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';
import { getDispatcher } from '../events/setup';
import {
  NegotiationStartedEvent,
  OfferSubmittedEvent,
  CounterOfferSubmittedEvent,
  NegotiationAcceptedEvent,
  ContractGeneratedEvent,
  ContractSignedEvent,
  DealStatusChangedEvent,
  DealCompletedEvent,
  DealCancelledEvent,
} from '../events/domain-events';

const eventStore = new PostgresEventStore();

// ============================================================================
// SUBMIT OFFER COMMAND
// ============================================================================

export interface SubmitOfferCommand {
  deal_id: string;
  campaign_id: string;
  submitted_by: 'brand' | 'creator';
  user_id: string;
  deliverables: Record<string, any>;
  price: number;
  currency: string;
  terms?: string;
}

export async function handleSubmitOfferCommand(
  command: SubmitOfferCommand
): Promise<{ offer_id: string }> {
  if (command.price <= 0) {
    throw new Error('Price must be greater than 0');
  }

  if (!command.deliverables || Object.keys(command.deliverables).length === 0) {
    throw new Error('Deliverables required');
  }

  const offer_id = uuid();
  const idempotency_key = `offer:submit:${command.deal_id}:${command.submitted_by}:${Date.now()}`;

  const event = new EventBuilder(
    'offer_submitted',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      deal_id: command.deal_id,
      offer_id,
      submitted_by: command.submitted_by,
      deliverables: command.deliverables,
      price: command.price,
      currency: command.currency,
      terms: command.terms,
      submitted_at: new Date().toISOString(),
    })
    .build() as OfferSubmittedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
  return { offer_id };
}

// ============================================================================
// SUBMIT COUNTER-OFFER COMMAND
// ============================================================================

export interface SubmitCounterOfferCommand {
  deal_id: string;
  submitted_by: 'brand' | 'creator';
  user_id: string;
  changes: Record<string, any>; // what changed from previous offer
}

export async function handleSubmitCounterOfferCommand(
  command: SubmitCounterOfferCommand
): Promise<{ counter_offer_id: string }> {
  const counter_offer_id = uuid();
  const idempotency_key = `counter:submit:${command.deal_id}:${command.submitted_by}:${Date.now()}`;

  const event = new EventBuilder(
    'counter_offer_submitted',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      deal_id: command.deal_id,
      counter_offer_id,
      submitted_by: command.submitted_by,
      changes: command.changes,
      submitted_at: new Date().toISOString(),
    })
    .build() as CounterOfferSubmittedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
  return { counter_offer_id };
}

// ============================================================================
// ACCEPT OFFER COMMAND
// ============================================================================

export interface AcceptOfferCommand {
  deal_id: string;
  offer_id: string;
  accepted_by: 'brand' | 'creator';
  user_id: string;
}

export async function handleAcceptOfferCommand(
  command: AcceptOfferCommand
): Promise<{ contract_id: string }> {
  const contract_id = uuid();
  const idempotency_key = `offer:accept:${command.offer_id}`;

  const event = new EventBuilder(
    'negotiation_accepted',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      deal_id: command.deal_id,
      final_offer_id: command.offer_id,
      accepted_by: command.accepted_by,
      accepted_at: new Date().toISOString(),
    })
    .build() as NegotiationAcceptedEvent;

  // TODO: Trigger contract generation workflow
  const contractEvent = new EventBuilder(
    'contract_generated',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(`contract:generate:${contract_id}`)
    .withData({
      deal_id: command.deal_id,
      contract_id,
      generated_at: new Date().toISOString(),
    })
    .build() as ContractGeneratedEvent;

  await eventStore.append([event, contractEvent]);
  await getDispatcher().dispatch(event);
  await getDispatcher().dispatch(contractEvent);
  return { contract_id };
}

// ============================================================================
// SIGN CONTRACT COMMAND
// ============================================================================

export interface SignContractCommand {
  deal_id: string;
  contract_id: string;
  signed_by: string; // user_id
  user_id: string;
}

export async function handleSignContractCommand(
  command: SignContractCommand
): Promise<void> {
  const idempotency_key = `contract:sign:${command.contract_id}:${command.signed_by}`;

  const event = new EventBuilder(
    'contract_signed',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      deal_id: command.deal_id,
      contract_id: command.contract_id,
      signed_by: command.signed_by,
      signed_at: new Date().toISOString(),
    })
    .build() as ContractSignedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// COMPLETE DEAL COMMAND
// ============================================================================

export interface CompleteDealCommand {
  deal_id: string;
  brand_id: string;
  creator_id: string;
  user_id: string;
}

export async function handleCompleteDealCommand(
  command: CompleteDealCommand
): Promise<void> {
  const idempotency_key = `deal:complete:${command.deal_id}`;

  const event = new EventBuilder(
    'deal_completed',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      deal_id: command.deal_id,
      brand_id: command.brand_id,
      creator_id: command.creator_id,
      completed_at: new Date().toISOString(),
    })
    .build() as DealCompletedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// CANCEL DEAL COMMAND
// ============================================================================

export interface CancelDealCommand {
  deal_id: string;
  cancelled_by: 'brand' | 'creator' | 'admin';
  reason: string;
  user_id: string;
}

export async function handleCancelDealCommand(
  command: CancelDealCommand
): Promise<void> {
  const idempotency_key = `deal:cancel:${command.deal_id}`;

  const event = new EventBuilder(
    'deal_cancelled',
    command.deal_id,
    'deal',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      deal_id: command.deal_id,
      cancelled_by: command.cancelled_by,
      reason: command.reason,
      cancelled_at: new Date().toISOString(),
    })
    .build() as DealCancelledEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}
