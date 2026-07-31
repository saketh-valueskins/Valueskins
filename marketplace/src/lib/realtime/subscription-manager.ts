/**
 * Realtime Subscription Manager
 * Routes events to subscribed clients
 * Handles offline user replay, presence, authorization
 */

import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { DomainEvent } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const eventStore = new PostgresEventStore();

// ============================================================================
// SUBSCRIPTION MODEL
// ============================================================================

export interface Subscription {
  subscription_id: string;
  user_id: string;
  channel_type: string; // 'campaign', 'deal', 'notification', etc
  channel_id: string; // specific campaign_id, deal_id, etc
  event_types: string[]; // which events to receive
  created_at: string;
}

export interface PresenceData {
  user_id: string;
  user_name: string;
  online: boolean;
  last_seen: string;
  viewing: string; // what page/deal they're on
}

// ============================================================================
// SUBSCRIPTION MANAGER
// ============================================================================

export class SubscriptionManager {
  /**
   * Subscribe user to a channel
   * Filters which events they should receive
   */
  async subscribe(
    user_id: string,
    channel_type: string,
    channel_id: string,
    event_types: string[] = ['*'] // '*' = all events
  ): Promise<Subscription> {
    const subscription_id = uuid();

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        subscription_id,
        user_id,
        channel_type,
        channel_id,
        event_types,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }

    // Update user's subscribed channels list
    await this.updateUserChannels(user_id, channel_type, channel_id);

    return data;
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(
    user_id: string,
    channel_type: string,
    channel_id: string
  ): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user_id)
      .eq('channel_type', channel_type)
      .eq('channel_id', channel_id);

    if (error) {
      throw new Error(`Failed to unsubscribe: ${error.message}`);
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(user_id: string): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all subscriptions for a channel (who's listening)
   */
  async getChannelSubscribers(
    channel_type: string,
    channel_id: string
  ): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('channel_type', channel_type)
      .eq('channel_id', channel_id);

    if (error) {
      throw new Error(`Failed to fetch subscribers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Publish event to channel
   * Only subscribers receive it
   */
  async publishEvent(
    channel_type: string,
    channel_id: string,
    event: DomainEvent
  ): Promise<void> {
    // Get all subscribed users
    const subscriptions = await this.getChannelSubscribers(
      channel_type,
      channel_id
    );

    // Publish to each subscriber via Supabase realtime
    for (const subscription of subscriptions) {
      // Check authorization (does this user have permission to see this event?)
      if (!(await this.isAuthorized(subscription.user_id, event))) {
        continue; // Skip unauthorized users
      }

      // Check event type filter
      if (
        !subscription.event_types.includes('*') &&
        !subscription.event_types.includes(event.event_type)
      ) {
        continue; // Skip if event type not subscribed to
      }

      // Publish via Supabase realtime
      supabase.realtime.publish(
        `${channel_type}:${channel_id}:${subscription.user_id}`,
        {
          type: 'event',
          event,
        }
      );
    }
  }

  /**
   * Replay missed events to reconnecting user
   * Used when offline user comes back online
   */
  async replayMissedEvents(user_id: string): Promise<DomainEvent[]> {
    // Get user's event pointer (where they left off)
    const { data: pointer, error: pointerError } = await supabase
      .from('user_event_pointers')
      .select('last_processed_at')
      .eq('user_id', user_id)
      .single();

    if (pointerError) {
      // First time logging in, no missed events
      return [];
    }

    const lastSeenAt = pointer?.last_processed_at || new Date(0).toISOString();

    // Get user's subscriptions
    const subscriptions = await this.getUserSubscriptions(user_id);

    // Fetch missed events for each subscription
    const missedEvents: DomainEvent[] = [];

    for (const subscription of subscriptions) {
      // Query events since last seen
      const events = await eventStore.getEventsSince(lastSeenAt, {
        aggregateType: subscription.channel_type,
      });

      // Filter to relevant channels
      const relevant = events.filter(
        e =>
          e.aggregate_id === subscription.channel_id &&
          this.shouldUserReceiveEvent(subscription, e)
      );

      missedEvents.push(...relevant);
    }

    // Update event pointer
    await this.updateEventPointer(user_id, new Date().toISOString());

    return missedEvents.sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() -
        new Date(b.occurred_at).getTime()
    );
  }

  /**
   * Track user presence (online/offline)
   */
  async setPresence(
    user_id: string,
    online: boolean,
    viewing?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('user_event_pointers')
      .update({
        is_online: online,
        last_seen_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Failed to update presence:', error);
    }

    // Broadcast presence to watchers
    supabase.realtime.publish('presence', {
      type: 'user_status_changed',
      user_id,
      online,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get online status for multiple users
   */
  async getOnlineStatus(user_ids: string[]): Promise<Map<string, boolean>> {
    const { data, error } = await supabase
      .from('user_event_pointers')
      .select('user_id, is_online')
      .in('user_id', user_ids);

    if (error) {
      console.error('Failed to fetch online status:', error);
      return new Map();
    }

    const map = new Map<string, boolean>();
    data?.forEach(row => {
      map.set(row.user_id, row.is_online);
    });
    return map;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private shouldUserReceiveEvent(
    subscription: Subscription,
    event: DomainEvent
  ): boolean {
    // Check event type filter
    if (
      subscription.event_types.includes('*') ||
      subscription.event_types.includes(event.event_type)
    ) {
      return true;
    }
    return false;
  }

  private async isAuthorized(
    user_id: string,
    event: DomainEvent
  ): Promise<boolean> {
    // Creator can see events about their own campaigns/deals
    if (event.data.creator_id === user_id) {
      return true;
    }

    // Brand can see events about their campaigns/deals
    if (event.data.brand_id === user_id) {
      return true;
    }

    // Admin can see everything
    const { data: user, error } = await supabase.auth.admin.getUserById(user_id);
    if (!error && user?.user_metadata?.role === 'admin') {
      return true;
    }

    // Default deny
    return false;
  }

  private async updateUserChannels(
    user_id: string,
    channel_type: string,
    channel_id: string
  ): Promise<void> {
    // Append to array of subscribed channels
    const { error } = await supabase.rpc('array_append', {
      user_id,
      channel_type,
      channel_id,
    });

    if (error) {
      console.error('Failed to update user channels:', error);
    }
  }

  private async updateEventPointer(
    user_id: string,
    timestamp: string
  ): Promise<void> {
    const { error } = await supabase
      .from('user_event_pointers')
      .update({
        last_processed_at: timestamp,
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Failed to update event pointer:', error);
    }
  }
}

// ============================================================================
// REALTIME BRIDGE (Frontend-facing)
// ============================================================================

export class RealtimeBridge {
  private subscriptionManager = new SubscriptionManager();

  /**
   * Initialize realtime connection for user
   * Subscribe to all relevant channels based on user's profile
   */
  async initializeForUser(user_id: string): Promise<void> {
    // Get user profile (brand or creator)
    const { data: profile, error } = await supabase
      .from('auth.users')
      .select('user_metadata')
      .eq('id', user_id)
      .single();

    if (error) {
      throw new Error('Failed to load user profile');
    }

    const userType = profile?.user_metadata?.user_type; // 'brand' | 'creator'

    if (userType === 'creator') {
      // Creator subscribes to:
      // - campaigns_for_valueSkin_X (campaigns matching their type)
      // - creator_notifications (personal notifications)
      // - deal_* (each deal they're in)

      // TODO: Subscribe to valueSkin channels

      await this.subscriptionManager.subscribe(
        user_id,
        'notification',
        user_id,
        ['notification_created', 'notification_sent']
      );
    } else if (userType === 'brand') {
      // Brand subscribes to:
      // - brand_campaigns (updates on their campaigns)
      // - brand_notifications (personal notifications)
      // - campaign_* (each campaign they created)

      // TODO: Subscribe to campaign channels

      await this.subscriptionManager.subscribe(
        user_id,
        'notification',
        user_id,
        ['notification_created', 'notification_sent']
      );
    }

    // Set online status
    await this.subscriptionManager.setPresence(user_id, true);

    // Replay missed events
    const missed = await this.subscriptionManager.replayMissedEvents(user_id);
    console.log(`Replayed ${missed.length} missed events for user ${user_id}`);
  }

  /**
   * Cleanup on disconnect
   */
  async cleanup(user_id: string): Promise<void> {
    await this.subscriptionManager.setPresence(user_id, false);
  }

  /**
   * Get manager for explicit use
   */
  getManager(): SubscriptionManager {
    return this.subscriptionManager;
  }
}

// Export singleton
export const realtimeBridge = new RealtimeBridge();
