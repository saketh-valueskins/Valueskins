import type { NextApiResponse } from 'next';

export interface BusEvent {
  event_type: string;
  user_ids: number[];
  data: Record<string, any>;
  timestamp: string;
}

type SendFn = (event: BusEvent) => void;

const subscriptions = new Map<number, Set<SendFn>>();

export function subscribe(userId: number, sendFn: SendFn): () => void {
  if (!subscriptions.has(userId)) {
    subscriptions.set(userId, new Set());
  }
  subscriptions.get(userId)!.add(sendFn);
  return () => {
    subscriptions.get(userId)?.delete(sendFn);
    if (subscriptions.get(userId)?.size === 0) {
      subscriptions.delete(userId);
    }
  };
}

export function broadcast(eventType: string, userIds: number[], data: Record<string, any>) {
  const event: BusEvent = {
    event_type: eventType,
    user_ids: userIds,
    data,
    timestamp: new Date().toISOString(),
  };
  for (const userId of userIds) {
    const userSubs = subscriptions.get(userId);
    if (userSubs) {
      for (const sendFn of userSubs) {
        try {
          sendFn(event);
        } catch (err) {
          console.error(`[EventBus] subscriber error for userId=${userId} event=${eventType}:`, err);
        }
      }
    }
  }
}

export function sseWrite(res: NextApiResponse, eventType: string, data: any) {
  res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}
