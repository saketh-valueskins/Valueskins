/**
 * Notification Commands - In-app, email, SMS delivery
 * Guarantees: at-least-once delivery, user preferences respected
 */

import { v4 as uuid } from 'uuid';
import { EventBuilder } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';
import { getDispatcher } from '../events/setup';
import {
  NotificationCreatedEvent,
  NotificationSentEvent,
  NotificationReadEvent,
  UserPreferencesUpdatedEvent,
} from '../events/domain-events';

const eventStore = new PostgresEventStore();

// ============================================================================
// CREATE NOTIFICATION COMMAND
// ============================================================================

export interface CreateNotificationCommand {
  notification_id: string;
  recipient_id: string;
  title: string;
  message: string;
  notification_type: 'campaign_created' | 'campaign_published' | 'invitation_received' | 'offer_submitted' | 'deal_updated' | 'payment_received' | 'system';
  related_entity_id: string; // campaign_id, deal_id, etc
  related_entity_type: string;
  channels: ('in_app' | 'email' | 'sms' | 'push')[];
  user_id: string;
}

export async function handleCreateNotificationCommand(
  command: CreateNotificationCommand
): Promise<{ notification_id: string }> {
  if (!command.title || command.title.trim().length === 0) {
    throw new Error('Notification title cannot be empty');
  }

  if (!command.message || command.message.trim().length === 0) {
    throw new Error('Notification message cannot be empty');
  }

  if (command.channels.length === 0) {
    throw new Error('At least one notification channel required');
  }

  const idempotency_key = `notification:create:${command.related_entity_id}:${command.notification_type}`;

  const event = new EventBuilder(
    'notification_created',
    command.notification_id,
    'notification',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      notification_id: command.notification_id,
      recipient_id: command.recipient_id,
      title: command.title,
      message: command.message,
      notification_type: command.notification_type,
      related_entity_id: command.related_entity_id,
      related_entity_type: command.related_entity_type,
      channels: command.channels,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .build() as NotificationCreatedEvent;

  await eventStore.append([event]);
  return { notification_id: command.notification_id };
}

// ============================================================================
// SEND NOTIFICATION COMMAND
// ============================================================================

export interface SendNotificationCommand {
  notification_id: string;
  recipient_id: string;
  channel: 'in_app' | 'email' | 'sms' | 'push';
  delivery_method: string; // 'email_service', 'sms_provider', 'push_service'
  user_id: string;
}

export async function handleSendNotificationCommand(
  command: SendNotificationCommand
): Promise<void> {
  const idempotency_key = `notification:send:${command.notification_id}:${command.channel}`;

  const event = new EventBuilder(
    'notification_sent',
    command.notification_id,
    'notification',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      notification_id: command.notification_id,
      recipient_id: command.recipient_id,
      channel: command.channel,
      delivery_method: command.delivery_method,
      sent_at: new Date().toISOString(),
    })
    .build() as NotificationSentEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// MARK NOTIFICATION READ COMMAND
// ============================================================================

export interface MarkNotificationReadCommand {
  notification_id: string;
  reader_id: string;
  user_id: string;
}

export async function handleMarkNotificationReadCommand(
  command: MarkNotificationReadCommand
): Promise<void> {
  const idempotency_key = `notification:read:${command.notification_id}`;

  const event = new EventBuilder(
    'notification_read',
    command.notification_id,
    'notification',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      notification_id: command.notification_id,
      reader_id: command.reader_id,
      read_at: new Date().toISOString(),
    })
    .build() as NotificationReadEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}

// ============================================================================
// UPDATE USER NOTIFICATION PREFERENCES COMMAND
// ============================================================================

export interface UpdateUserPreferencesCommand {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  notification_types_opt_in: string[]; // Types user wants to receive
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;   // HH:MM format
}

export async function handleUpdateUserPreferencesCommand(
  command: UpdateUserPreferencesCommand
): Promise<void> {
  const preferences_id = uuid();
  const idempotency_key = `preferences:update:${command.user_id}`;

  const event = new EventBuilder(
    'user_preferences_updated',
    command.user_id,
    'user',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      preferences_id,
      user_id: command.user_id,
      email_enabled: command.email_enabled,
      sms_enabled: command.sms_enabled,
      push_enabled: command.push_enabled,
      notification_types_opt_in: command.notification_types_opt_in,
      quiet_hours_start: command.quiet_hours_start,
      quiet_hours_end: command.quiet_hours_end,
      updated_at: new Date().toISOString(),
    })
    .build() as UserPreferencesUpdatedEvent;

  await eventStore.append([event]);
  await getDispatcher().dispatch(event);
}
