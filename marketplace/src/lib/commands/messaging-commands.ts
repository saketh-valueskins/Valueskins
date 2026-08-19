/**
 * Messaging Commands - Deal-specific chat and communication
 * Guarantees: delivery acks, read status, typing indicators
 */

import { v4 as uuid } from 'uuid';
import { EventBuilder } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';
import { getDispatcher } from '../events/setup';
import {
  MessageSentEvent,
  MessageDeliveredEvent,
  MessageReadEvent,
  TypingIndicatorEvent,
  ConversationStartedEvent,
  ConversationClosedEvent,
} from '../events/domain-events';

const eventStore = new PostgresEventStore();

// ============================================================================
// START CONVERSATION COMMAND
// ============================================================================

export interface StartConversationCommand {
  conversation_id: string;
  deal_id: string;
  participant_1_id: string;
  participant_2_id: string;
  user_id: string;
}

export async function handleStartConversationCommand(
  command: StartConversationCommand
): Promise<{ conversation_id: string }> {
  const idempotency_key = `conversation:start:${command.deal_id}`;

  const event = new EventBuilder(
    'conversation_started',
    command.conversation_id,
    'conversation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      conversation_id: command.conversation_id,
      deal_id: command.deal_id,
      participants: [command.participant_1_id, command.participant_2_id],
      started_at: new Date().toISOString(),
    })
    .build() as ConversationStartedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
  return { conversation_id: command.conversation_id };
}

// ============================================================================
// SEND MESSAGE COMMAND
// ============================================================================

export interface SendMessageCommand {
  message_id: string;
  conversation_id: string;
  deal_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'file' | 'media' | 'system';
  file_urls?: string[];
  user_id: string;
}

export async function handleSendMessageCommand(
  command: SendMessageCommand
): Promise<{ message_id: string; sent_at: string }> {
  if (!command.content || command.content.trim().length === 0) {
    throw new Error('Message content cannot be empty');
  }

  if (command.content.length > 5000) {
    throw new Error('Message exceeds maximum length of 5000 characters');
  }

  const sent_at = new Date().toISOString();
  const idempotency_key = `message:send:${command.message_id}`;

  const event = new EventBuilder(
    'message_sent',
    command.conversation_id,
    'conversation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      message_id: command.message_id,
      conversation_id: command.conversation_id,
      deal_id: command.deal_id,
      sender_id: command.sender_id,
      recipient_id: command.recipient_id,
      content: command.content,
      message_type: command.message_type,
      file_urls: command.file_urls || [],
      sent_at,
    })
    .build() as MessageSentEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
  return { message_id: command.message_id, sent_at };
}

// ============================================================================
// MARK MESSAGE DELIVERED COMMAND
// ============================================================================

export interface MarkDeliveredCommand {
  message_id: string;
  conversation_id: string;
  user_id: string;
}

export async function handleMarkDeliveredCommand(
  command: MarkDeliveredCommand
): Promise<void> {
  const idempotency_key = `message:delivered:${command.message_id}`;

  const event = new EventBuilder(
    'message_delivered',
    command.conversation_id,
    'conversation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      message_id: command.message_id,
      delivered_at: new Date().toISOString(),
    })
    .build() as MessageDeliveredEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// MARK MESSAGE READ COMMAND
// ============================================================================

export interface MarkReadCommand {
  message_id: string;
  conversation_id: string;
  reader_id: string;
  user_id: string;
}

export async function handleMarkReadCommand(
  command: MarkReadCommand
): Promise<void> {
  const idempotency_key = `message:read:${command.message_id}:${command.reader_id}`;

  const event = new EventBuilder(
    'message_read',
    command.conversation_id,
    'conversation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      message_id: command.message_id,
      reader_id: command.reader_id,
      read_at: new Date().toISOString(),
    })
    .build() as MessageReadEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// SEND TYPING INDICATOR COMMAND
// ============================================================================

export interface SendTypingIndicatorCommand {
  conversation_id: string;
  sender_id: string;
  is_typing: boolean;
  user_id: string;
}

export async function handleSendTypingIndicatorCommand(
  command: SendTypingIndicatorCommand
): Promise<void> {
  const event = new EventBuilder(
    'typing_indicator',
    command.conversation_id,
    'conversation',
    command.user_id
  )
    .withIdempotencyKey(`typing:${command.conversation_id}:${command.sender_id}:${Date.now()}`)
    .withData({
      conversation_id: command.conversation_id,
      sender_id: command.sender_id,
      is_typing: command.is_typing,
      sent_at: new Date().toISOString(),
    })
    .build() as TypingIndicatorEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// CLOSE CONVERSATION COMMAND
// ============================================================================

export interface CloseConversationCommand {
  conversation_id: string;
  deal_id: string;
  closed_by: string;
  reason?: string;
  user_id: string;
}

export async function handleCloseConversationCommand(
  command: CloseConversationCommand
): Promise<void> {
  const idempotency_key = `conversation:close:${command.conversation_id}`;

  const event = new EventBuilder(
    'conversation_closed',
    command.conversation_id,
    'conversation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      conversation_id: command.conversation_id,
      deal_id: command.deal_id,
      closed_by: command.closed_by,
      reason: command.reason,
      closed_at: new Date().toISOString(),
    })
    .build() as ConversationClosedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}
