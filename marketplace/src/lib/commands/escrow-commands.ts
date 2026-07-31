/**
 * Escrow Commands - Secure payment holding and release
 * Guarantees: funds held until both parties agree or dispute resolved
 */

import { v4 as uuid } from 'uuid';
import { EventBuilder } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';
import { getDispatcher } from '../events/setup';
import {
  EscrowCreatedEvent,
  EscrowFundedEvent,
  EscrowHeldEvent,
  EscrowReleaseRequestedEvent,
  EscrowReleasedEvent,
  EscrowRefundedEvent,
  DisputeOpenedEvent,
  DisputeResolvedEvent,
} from '../events/domain-events';

const eventStore = new PostgresEventStore();

// ============================================================================
// CREATE ESCROW COMMAND
// ============================================================================

export interface CreateEscrowCommand {
  deal_id: string;
  escrow_id: string;
  brand_id: string;
  creator_id: string;
  amount: number;
  currency: string;
  content_hash: string; // Hash of agreed deliverables
  user_id: string;
}

export async function handleCreateEscrowCommand(
  command: CreateEscrowCommand
): Promise<{ escrow_id: string }> {
  if (command.amount <= 0) {
    throw new Error('Escrow amount must be greater than 0');
  }

  const idempotency_key = `escrow:create:${command.deal_id}`;

  const event = new EventBuilder(
    'escrow_created',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      brand_id: command.brand_id,
      creator_id: command.creator_id,
      amount: command.amount,
      currency: command.currency,
      content_hash: command.content_hash,
      status: 'pending_funding',
      created_at: new Date().toISOString(),
    })
    .build() as EscrowCreatedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
  return { escrow_id: command.escrow_id };
}

// ============================================================================
// FUND ESCROW COMMAND
// ============================================================================

export interface FundEscrowCommand {
  escrow_id: string;
  deal_id: string;
  brand_id: string;
  amount: number;
  payment_intent_id: string; // From Stripe/Razorpay
  user_id: string;
}

export async function handleFundEscrowCommand(
  command: FundEscrowCommand
): Promise<void> {
  const idempotency_key = `escrow:fund:${command.payment_intent_id}`;

  const fundedEvent = new EventBuilder(
    'escrow_funded',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      brand_id: command.brand_id,
      amount: command.amount,
      payment_intent_id: command.payment_intent_id,
      funded_at: new Date().toISOString(),
    })
    .build() as EscrowFundedEvent;

  const heldEvent = new EventBuilder(
    'escrow_held',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(`escrow:held:${command.escrow_id}`)
    .withData({
      escrow_id: command.escrow_id,
      held_at: new Date().toISOString(),
    })
    .build() as EscrowHeldEvent;

  await eventStore.append([fundedEvent, heldEvent]);
  await getDispatcher().dispatch(fundedEvent);
  await getDispatcher().dispatch(heldEvent);
}

// ============================================================================
// REQUEST RELEASE COMMAND
// ============================================================================

export interface RequestReleaseCommand {
  escrow_id: string;
  deal_id: string;
  requested_by: 'brand' | 'creator';
  user_id: string;
  release_reason: string;
}

export async function handleRequestReleaseCommand(
  command: RequestReleaseCommand
): Promise<void> {
  const idempotency_key = `escrow:release:request:${command.escrow_id}:${command.requested_by}`;

  const event = new EventBuilder(
    'escrow_release_requested',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      requested_by: command.requested_by,
      release_reason: command.release_reason,
      requested_at: new Date().toISOString(),
    })
    .build() as EscrowReleaseRequestedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// RELEASE ESCROW COMMAND
// ============================================================================

export interface ReleaseEscrowCommand {
  escrow_id: string;
  deal_id: string;
  creator_id: string;
  amount: number;
  payout_method: 'bank_transfer' | 'wallet' | 'crypto';
  user_id: string;
}

export async function handleReleaseEscrowCommand(
  command: ReleaseEscrowCommand
): Promise<void> {
  const idempotency_key = `escrow:release:execute:${command.escrow_id}`;

  const event = new EventBuilder(
    'escrow_released',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      creator_id: command.creator_id,
      amount: command.amount,
      payout_method: command.payout_method,
      released_at: new Date().toISOString(),
    })
    .build() as EscrowReleasedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// REFUND ESCROW COMMAND
// ============================================================================

export interface RefundEscrowCommand {
  escrow_id: string;
  deal_id: string;
  brand_id: string;
  amount: number;
  refund_reason: string;
  user_id: string;
}

export async function handleRefundEscrowCommand(
  command: RefundEscrowCommand
): Promise<void> {
  const idempotency_key = `escrow:refund:${command.escrow_id}`;

  const event = new EventBuilder(
    'escrow_refunded',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      brand_id: command.brand_id,
      amount: command.amount,
      refund_reason: command.refund_reason,
      refunded_at: new Date().toISOString(),
    })
    .build() as EscrowRefundedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// OPEN DISPUTE COMMAND
// ============================================================================

export interface OpenDisputeCommand {
  escrow_id: string;
  deal_id: string;
  opened_by: 'brand' | 'creator';
  reason: string;
  evidence_urls?: string[];
  user_id: string;
}

export async function handleOpenDisputeCommand(
  command: OpenDisputeCommand
): Promise<{ dispute_id: string }> {
  const dispute_id = uuid();
  const idempotency_key = `dispute:open:${command.escrow_id}:${command.opened_by}`;

  const event = new EventBuilder(
    'dispute_opened',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      dispute_id,
      opened_by: command.opened_by,
      reason: command.reason,
      evidence_urls: command.evidence_urls || [],
      opened_at: new Date().toISOString(),
    })
    .build() as DisputeOpenedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
  return { dispute_id };
}

// ============================================================================
// RESOLVE DISPUTE COMMAND
// ============================================================================

export interface ResolveDisputeCommand {
  dispute_id: string;
  escrow_id: string;
  deal_id: string;
  resolution: 'release_to_creator' | 'refund_to_brand' | 'split';
  split_percentage?: number; // For split resolution
  resolution_reason: string;
  user_id: string;
}

export async function handleResolveDisputeCommand(
  command: ResolveDisputeCommand
): Promise<void> {
  if (command.resolution === 'split' && (!command.split_percentage || command.split_percentage <= 0 || command.split_percentage >= 100)) {
    throw new Error('Split percentage must be between 0 and 100');
  }

  const idempotency_key = `dispute:resolve:${command.dispute_id}`;

  const event = new EventBuilder(
    'dispute_resolved',
    command.escrow_id,
    'escrow',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      dispute_id: command.dispute_id,
      escrow_id: command.escrow_id,
      deal_id: command.deal_id,
      resolution: command.resolution,
      split_percentage: command.split_percentage,
      resolution_reason: command.resolution_reason,
      resolved_at: new Date().toISOString(),
    })
    .build() as DisputeResolvedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}
