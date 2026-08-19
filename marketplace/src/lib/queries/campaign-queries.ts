/**
 * Campaign Queries - Read Path (CQRS)
 * Never write to database directly
 * Read from denormalized views (fast, eventually consistent)
 */

import { createClient } from '@supabase/supabase-js';
import { PostgresEventStore } from '../events/postgres-event-store';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const eventStore = new PostgresEventStore();

export interface Campaign {
  campaign_id: string;
  brand_id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled' | 'archived';
  target_valueSkins: ('Type1' | 'Type2' | 'Type3')[];
  budget: number;
  currency: string;
  deadline: string;
  location?: string;
  requirements?: string;
  creator_count: number;
  invitation_count: number;
  application_count: number;
  created_at: string;
  published_at?: string;
  completed_at?: string;
}

// ============================================================================
// SINGLE CAMPAIGN QUERY
// ============================================================================

export async function getCampaign(campaign_id: string): Promise<Campaign | null> {
  // Try read model first (fast, denormalized)
  const { data, error } = await supabase
    .from('campaigns_view')
    .select('*')
    .eq('campaign_id', campaign_id)
    .single();

  if (!error && data) {
    return data;
  }

  // If read model stale or doesn't exist, rebuild from events
  return await rebuildCampaignState(campaign_id);
}

/**
 * Rebuild campaign state from event stream
 * Used when read model is stale or doesn't exist
 */
async function rebuildCampaignState(campaign_id: string): Promise<Campaign | null> {
  const events = await eventStore.getByAggregateId(campaign_id);

  if (events.length === 0) {
    return null;
  }

  let campaign: Partial<Campaign> = {
    campaign_id,
    status: 'draft',
    creator_count: 0,
    invitation_count: 0,
    application_count: 0,
  };

  for (const event of events) {
    switch (event.event_type) {
      case 'campaign_created':
        campaign = {
          ...campaign,
          ...event.data,
          status: 'draft',
          created_at: event.occurred_at,
        };
        break;

      case 'campaign_published':
        campaign.status = 'published';
        campaign.published_at = event.occurred_at;
        break;

      case 'campaign_invitation_sent':
        campaign.invitation_count = (campaign.invitation_count || 0) + 1;
        break;

      case 'creator_accepted_invitation':
        campaign.creator_count = (campaign.creator_count || 0) + 1;
        campaign.application_count = (campaign.application_count || 0) + 1;
        break;

      case 'campaign_closed':
        campaign.status = event.data.reason === 'completed' ? 'completed' : event.data.reason;
        campaign.completed_at = event.occurred_at;
        break;
    }
  }

  // Update read model for future queries
  await updateCampaignView(campaign as Campaign);

  return campaign as Campaign;
}

// ============================================================================
// CAMPAIGNS FOR CREATOR QUERY
// ============================================================================

export async function getCampaignsForCreator(
  creator_id: string,
  filters?: {
    valueSkin?: 'Type1' | 'Type2' | 'Type3';
    location?: string;
    minBudget?: number;
    maxBudget?: number;
    status?: string;
  }
): Promise<Campaign[]> {
  // Get creator's valueSkins
  const creatorEvents = await eventStore.getByAggregateId(creator_id);
  const profileEvent = creatorEvents.find(e => e.event_type === 'creator_profile_created');

  if (!profileEvent) {
    return [];
  }

  const creatorValueSkins = profileEvent.data.valueSkins || [];

  // Query from read model
  let query = supabase
    .from('campaigns_view')
    .select('*')
    .eq('status', 'published')
    .gt('deadline', new Date().toISOString()); // Only future deadlines

  // Filter by valueSkin match
  for (const valueSkin of creatorValueSkins) {
    query = query.contains('target_valueSkins', [valueSkin]);
  }

  // Apply additional filters
  if (filters?.location) {
    query = query.eq('location', filters.location);
  }
  if (filters?.minBudget) {
    query = query.gte('budget', filters.minBudget);
  }
  if (filters?.maxBudget) {
    query = query.lte('budget', filters.maxBudget);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch campaigns:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// CAMPAIGNS FOR BRAND QUERY
// ============================================================================

export async function getCampaignsForBrand(brand_id: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns_view')
    .select('*')
    .eq('brand_id', brand_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch campaigns:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// SEARCH CAMPAIGNS QUERY
// ============================================================================

export async function searchCampaigns(
  searchTerm: string,
  filters?: {
    valueSkin?: string;
    minBudget?: number;
    maxBudget?: number;
  }
): Promise<Campaign[]> {
  let query = supabase
    .from('campaigns_view')
    .select('*')
    .eq('status', 'published')
    .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

  if (filters?.valueSkin) {
    query = query.contains('target_valueSkins', [filters.valueSkin]);
  }
  if (filters?.minBudget) {
    query = query.gte('budget', filters.minBudget);
  }
  if (filters?.maxBudget) {
    query = query.lte('budget', filters.maxBudget);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Search failed:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// HELPER: Update read model
// ============================================================================

async function updateCampaignView(campaign: Campaign): Promise<void> {
  const { error } = await supabase
    .from('campaigns_view')
    .upsert(
      {
        ...campaign,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'campaign_id' }
    );

  if (error) {
    console.error('Failed to update campaign view:', error);
  }
}
