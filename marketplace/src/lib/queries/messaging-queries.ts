/**
 * Messaging Queries - Read Path
 * Conversation history, unread counts, delivery status
 */

import { PostgresEventStore } from '../events/postgres-event-store';

const eventStore = new PostgresEventStore();

// ============================================================================
// GET CONVERSATION WITH MESSAGES
// ============================================================================

export async function getConversationMessages(conversation_id: string) {
  const events = await eventStore.getByAggregateId(conversation_id, 'conversation');

  if (!events || events.length === 0) {
    throw new Error(`Conversation not found: ${conversation_id}`);
  }

  const messages = [] as any[];
  const participants = new Set<string>();

  events.forEach((event) => {
    switch (event.event_type) {
      case 'conversation_started':
        event.data.participants.forEach((p: string) => participants.add(p));
        break;

      case 'message_sent':
        messages.push({
          message_id: event.data.message_id,
          sender_id: event.data.sender_id,
          content: event.data.content,
          message_type: event.data.message_type,
          file_urls: event.data.file_urls,
          sent_at: event.data.sent_at,
          delivered_at: null as string | null,
          read_by: [] as string[],
        });
        break;

      case 'message_delivered':
        const deliveredMsg = messages.find((m) => m.message_id === event.data.message_id);
        if (deliveredMsg) {
          deliveredMsg.delivered_at = event.data.delivered_at;
        }
        break;

      case 'message_read':
        const readMsg = messages.find((m) => m.message_id === event.data.message_id);
        if (readMsg && !readMsg.read_by.includes(event.data.reader_id)) {
          readMsg.read_by.push(event.data.reader_id);
        }
        break;
    }
  });

  return {
    conversation_id,
    participants: Array.from(participants),
    messages: messages.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
  };
}

// ============================================================================
// GET UNREAD MESSAGE COUNT FOR USER
// ============================================================================

export async function getUnreadMessageCount(user_id: string): Promise<number> {
  const query = `
    SELECT COUNT(*) as unread_count
    FROM events_log e
    WHERE e.event_type = 'message_sent'
      AND e.data->>'recipient_id' = $1
      AND NOT EXISTS (
        SELECT 1 FROM events_log r
        WHERE r.event_type = 'message_read'
          AND r.data->>'message_id' = e.data->>'message_id'
          AND r.data->>'reader_id' = $1
      )
  `;

  const result = await eventStore['pool'].query(query, [user_id]);
  return parseInt(result.rows[0]?.unread_count || '0', 10);
}

// ============================================================================
// GET USER'S CONVERSATIONS LIST
// ============================================================================

export async function getUserConversations(user_id: string) {
  const query = `
    SELECT DISTINCT
      e.aggregate_id as conversation_id,
      e.data->>'deal_id' as deal_id,
      e.occurred_at,
      (SELECT COUNT(*)
       FROM events_log m
       WHERE m.aggregate_id = e.aggregate_id
         AND m.event_type = 'message_sent'
         AND m.data->>'recipient_id' = $1
         AND NOT EXISTS (
           SELECT 1 FROM events_log r
           WHERE r.event_type = 'message_read'
             AND r.data->>'message_id' = m.data->>'message_id'
             AND r.data->>'reader_id' = $1
         )) as unread_count
    FROM events_log e
    WHERE e.aggregate_type = 'conversation'
      AND e.event_type = 'conversation_started'
      AND e.data @> json_build_array($1)
    ORDER BY e.occurred_at DESC
  `;

  const result = await eventStore['pool'].query(query, [user_id]);

  return result.rows.map((row) => ({
    conversation_id: row.conversation_id,
    deal_id: row.deal_id,
    unread_count: parseInt(row.unread_count, 10),
    last_activity: row.occurred_at,
  }));
}

// ============================================================================
// GET TYPING STATUS IN CONVERSATION
// ============================================================================

export async function getConversationTypingStatus(conversation_id: string) {
  const query = `
    SELECT DISTINCT
      (e.data->>'sender_id') as user_id,
      (e.data->>'is_typing')::boolean as is_typing,
      e.occurred_at
    FROM events_log e
    WHERE e.aggregate_id = $1
      AND e.event_type = 'typing_indicator'
    ORDER BY e.occurred_at DESC
    LIMIT 10
  `;

  const result = await eventStore['pool'].query(query, [conversation_id]);

  const typingMap = new Map<string, { is_typing: boolean; timestamp: string }>();
  result.rows.forEach((row) => {
    if (!typingMap.has(row.user_id)) {
      typingMap.set(row.user_id, {
        is_typing: row.is_typing,
        timestamp: row.occurred_at,
      });
    }
  });

  return Array.from(typingMap.entries()).map(([user_id, status]) => ({
    user_id,
    ...status,
  }));
}

// ============================================================================
// GET MESSAGE DELIVERY STATUS
// ============================================================================

export async function getMessageDeliveryStatus(message_id: string) {
  const events = await eventStore.getByAggregateId(message_id, 'conversation');

  const status = {
    message_id,
    sent: false,
    delivered: false,
    read_by: [] as string[],
    sent_at: null as string | null,
    delivered_at: null as string | null,
  };

  events?.forEach((event) => {
    if (event.event_type === 'message_sent') {
      status.sent = true;
      status.sent_at = event.data.sent_at;
    }
    if (event.event_type === 'message_delivered') {
      status.delivered = true;
      status.delivered_at = event.data.delivered_at;
    }
    if (event.event_type === 'message_read') {
      status.read_by.push(event.data.reader_id);
    }
  });

  return status;
}
