/**
 * ALL Domain Events for ValueSkins
 * Immutable, versioned, with full audit trail
 * Every event is source of truth for what happened
 */

import { DomainEvent } from './core';

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

export interface UserAuthenticatedEvent extends DomainEvent {
  event_type: 'user_authenticated';
  data: {
    user_id: string;
    email: string;
    auth_provider: 'google' | 'github' | 'email';
    is_new_user: boolean;
  };
}

export interface UserLoggedOutEvent extends DomainEvent {
  event_type: 'user_logged_out';
  data: {
    user_id: string;
    session_id: string;
  };
}

export interface SessionCreatedEvent extends DomainEvent {
  event_type: 'session_created';
  data: {
    session_id: string;
    user_id: string;
    expires_at: string; // ISO8601
  };
}

export interface SessionInvalidatedEvent extends DomainEvent {
  event_type: 'session_invalidated';
  data: {
    session_id: string;
    user_id: string;
    reason: 'logout' | 'timeout' | 'security' | 'password_change';
  };
}

// ============================================================================
// USER PROFILE EVENTS
// ============================================================================

export interface BrandProfileCreatedEvent extends DomainEvent {
  event_type: 'brand_profile_created';
  data: {
    brand_id: string;
    user_id: string;
    name: string;
    email: string;
    website?: string;
    industry?: string;
    location?: string;
    logo_url?: string;
  };
}

export interface CreatorProfileCreatedEvent extends DomainEvent {
  event_type: 'creator_profile_created';
  data: {
    creator_id: string;
    user_id: string;
    name: string;
    email: string;
    valueSkins: ('Type1' | 'Type2' | 'Type3')[];
    location?: string;
    bio?: string;
    portfolio_urls?: string[];
  };
}

export interface ProfileUpdatedEvent extends DomainEvent {
  event_type: 'profile_updated';
  data: {
    user_id: string;
    profile_type: 'brand' | 'creator';
    changes: Record<string, any>;
  };
}

export interface ProfileCompletedEvent extends DomainEvent {
  event_type: 'profile_completed';
  data: {
    user_id: string;
    profile_type: 'brand' | 'creator';
    completion_percentage: number;
  };
}

// ============================================================================
// VALUESKIN EVENTS
// ============================================================================

export interface CreatorCategorizedEvent extends DomainEvent {
  event_type: 'creator_categorized';
  data: {
    creator_id: string;
    valueSkins: ('Type1' | 'Type2' | 'Type3')[];
    previous_valueSkins: ('Type1' | 'Type2' | 'Type3')[];
  };
}

export interface CreatorDiscoverabilityUpdatedEvent extends DomainEvent {
  event_type: 'creator_discoverability_updated';
  data: {
    creator_id: string;
    is_discoverable: boolean;
    reason?: string;
  };
}

// ============================================================================
// CAMPAIGN EVENTS
// ============================================================================

export interface CampaignCreatedEvent extends DomainEvent {
  event_type: 'campaign_created';
  data: {
    campaign_id: string;
    brand_id: string;
    title: string;
    description: string;
    target_valueSkins: ('Type1' | 'Type2' | 'Type3')[];
    budget: number;
    currency: string;
    deadline: string; // ISO8601
    location?: string;
    requirements?: string;
  };
}

export interface CampaignPublishedEvent extends DomainEvent {
  event_type: 'campaign_published';
  data: {
    campaign_id: string;
    brand_id: string;
    eligible_creators_count: number;
  };
}

export interface CampaignInvitationSentEvent extends DomainEvent {
  event_type: 'campaign_invitation_sent';
  data: {
    invitation_id: string;
    campaign_id: string;
    creator_id: string;
    sent_at: string; // ISO8601
  };
}

export interface CreatorViewedInvitationEvent extends DomainEvent {
  event_type: 'creator_viewed_invitation';
  data: {
    invitation_id: string;
    campaign_id: string;
    creator_id: string;
    viewed_at: string; // ISO8601
  };
}

export interface CreatorAcceptedInvitationEvent extends DomainEvent {
  event_type: 'creator_accepted_invitation';
  data: {
    invitation_id: string;
    campaign_id: string;
    creator_id: string;
    deal_id: string;
    accepted_at: string; // ISO8601
  };
}

export interface CreatorDeclinedInvitationEvent extends DomainEvent {
  event_type: 'creator_declined_invitation';
  data: {
    invitation_id: string;
    campaign_id: string;
    creator_id: string;
    reason?: string;
    declined_at: string; // ISO8601
  };
}

export interface CampaignClosedEvent extends DomainEvent {
  event_type: 'campaign_closed';
  data: {
    campaign_id: string;
    brand_id: string;
    reason: 'completed' | 'cancelled' | 'expired';
    closed_at: string; // ISO8601
  };
}

export interface CampaignArchivedEvent extends DomainEvent {
  event_type: 'campaign_archived';
  data: {
    campaign_id: string;
    archived_at: string; // ISO8601
  };
}

// ============================================================================
// DEAL EVENTS
// ============================================================================

export interface DealCreatedEvent extends DomainEvent {
  event_type: 'deal_created';
  data: {
    deal_id: string;
    campaign_id: string;
    brand_id: string;
    creator_id: string;
    status: 'negotiation';
    created_at: string; // ISO8601
  };
}

export interface NegotiationStartedEvent extends DomainEvent {
  event_type: 'negotiation_started';
  data: {
    deal_id: string;
    campaign_id: string;
    brand_id: string;
    creator_id: string;
    started_at: string; // ISO8601
  };
}

export interface OfferSubmittedEvent extends DomainEvent {
  event_type: 'offer_submitted';
  data: {
    deal_id: string;
    offer_id: string;
    submitted_by: 'brand' | 'creator';
    deliverables: Record<string, any>;
    price: number;
    currency: string;
    terms?: string;
    submitted_at: string; // ISO8601
  };
}

export interface CounterOfferSubmittedEvent extends DomainEvent {
  event_type: 'counter_offer_submitted';
  data: {
    deal_id: string;
    counter_offer_id: string;
    submitted_by: 'brand' | 'creator';
    changes: Record<string, any>;
    submitted_at: string; // ISO8601
  };
}

export interface NegotiationAcceptedEvent extends DomainEvent {
  event_type: 'negotiation_accepted';
  data: {
    deal_id: string;
    final_offer_id: string;
    accepted_by: 'brand' | 'creator';
    accepted_at: string; // ISO8601
  };
}

export interface ContractGeneratedEvent extends DomainEvent {
  event_type: 'contract_generated';
  data: {
    deal_id: string;
    contract_id: string;
    generated_at: string; // ISO8601
  };
}

export interface ContractSignedEvent extends DomainEvent {
  event_type: 'contract_signed';
  data: {
    deal_id: string;
    contract_id: string;
    signed_by: string; // user_id
    signed_at: string; // ISO8601
  };
}

export interface DealStatusChangedEvent extends DomainEvent {
  event_type: 'deal_status_changed';
  data: {
    deal_id: string;
    from_status: string;
    to_status: string;
    reason: string;
    changed_at: string; // ISO8601
  };
}

export interface DealCompletedEvent extends DomainEvent {
  event_type: 'deal_completed';
  data: {
    deal_id: string;
    brand_id: string;
    creator_id: string;
    completed_at: string; // ISO8601
  };
}

export interface DealDisputedEvent extends DomainEvent {
  event_type: 'deal_disputed';
  data: {
    deal_id: string;
    dispute_id: string;
    filed_by: 'brand' | 'creator';
    reason: string;
    filed_at: string; // ISO8601
  };
}

export interface DealCancelledEvent extends DomainEvent {
  event_type: 'deal_cancelled';
  data: {
    deal_id: string;
    cancelled_by: 'brand' | 'creator' | 'admin';
    reason: string;
    cancelled_at: string; // ISO8601
  };
}

// ============================================================================
// ESCROW EVENTS
// ============================================================================

export interface EscrowCreatedEvent extends DomainEvent {
  event_type: 'escrow_created';
  data: {
    escrow_id: string;
    deal_id: string;
    brand_id: string;
    creator_id: string;
    amount: number;
    currency: string;
    created_at: string; // ISO8601
  };
}

export interface EscrowFundedEvent extends DomainEvent {
  event_type: 'escrow_funded';
  data: {
    escrow_id: string;
    deal_id: string;
    brand_id: string;
    amount: number;
    currency: string;
    transaction_id: string;
    payment_method: 'card' | 'bank_transfer' | 'wallet';
    funded_at: string; // ISO8601
  };
}

export interface DeliverableSubmittedEvent extends DomainEvent {
  event_type: 'deliverable_submitted';
  data: {
    deal_id: string;
    escrow_id: string;
    creator_id: string;
    deliverables_url: string;
    deliverables_description: string;
    submitted_at: string; // ISO8601
  };
}

export interface DeliverableApprovedEvent extends DomainEvent {
  event_type: 'deliverable_approved';
  data: {
    deal_id: string;
    approved_by: string; // brand_id
    approved_at: string; // ISO8601
  };
}

export interface DeliverableRejectedEvent extends DomainEvent {
  event_type: 'deliverable_rejected';
  data: {
    deal_id: string;
    rejected_by: string; // brand_id
    feedback: string;
    rejected_at: string; // ISO8601
  };
}

export interface EscrowReleasedEvent extends DomainEvent {
  event_type: 'escrow_released';
  data: {
    escrow_id: string;
    deal_id: string;
    brand_id: string;
    creator_id: string;
    amount: number;
    currency: string;
    released_by: 'brand' | 'admin';
    released_at: string; // ISO8601
  };
}

export interface EscrowRefundedEvent extends DomainEvent {
  event_type: 'escrow_refunded';
  data: {
    escrow_id: string;
    deal_id: string;
    brand_id: string;
    amount: number;
    currency: string;
    refunded_by: 'creator' | 'admin';
    reason: string;
    refunded_at: string; // ISO8601
  };
}

export interface DisputeFiledEvent extends DomainEvent {
  event_type: 'dispute_filed';
  data: {
    dispute_id: string;
    escrow_id: string;
    deal_id: string;
    filed_by: 'brand' | 'creator';
    reason: string;
    filed_at: string; // ISO8601
  };
}

export interface DisputeResolvedEvent extends DomainEvent {
  event_type: 'dispute_resolved';
  data: {
    dispute_id: string;
    escrow_id: string;
    resolution: 'released_to_creator' | 'refunded_to_brand' | 'split';
    resolved_by: 'admin' | 'arbitration';
    resolved_at: string; // ISO8601
  };
}

// ============================================================================
// MESSAGING EVENTS
// ============================================================================

export interface MessageSentEvent extends DomainEvent {
  event_type: 'message_sent';
  data: {
    message_id: string;
    deal_id: string;
    sender_id: string;
    recipient_id: string;
    body: string;
    attachments?: Array<{ url: string; type: string }>;
    sent_at: string; // ISO8601
  };
}

export interface MessageDeliveredEvent extends DomainEvent {
  event_type: 'message_delivered';
  data: {
    message_id: string;
    deal_id: string;
    delivered_to: string;
    delivered_at: string; // ISO8601
  };
}

export interface MessageReadEvent extends DomainEvent {
  event_type: 'message_read';
  data: {
    message_id: string;
    deal_id: string;
    read_by: string;
    read_at: string; // ISO8601
  };
}

export interface TypingIndicatorStartedEvent extends DomainEvent {
  event_type: 'typing_indicator_started';
  data: {
    deal_id: string;
    user_id: string;
  };
}

export interface TypingIndicatorStoppedEvent extends DomainEvent {
  event_type: 'typing_indicator_stopped';
  data: {
    deal_id: string;
    user_id: string;
  };
}

// ============================================================================
// REPUTATION EVENTS
// ============================================================================

export interface RatingSubmittedEvent extends DomainEvent {
  event_type: 'rating_submitted';
  data: {
    rating_id: string;
    deal_id: string;
    rated_by: string;
    rated_user: string;
    rating: 1 | 2 | 3 | 4 | 5;
    review_text?: string;
    submitted_at: string; // ISO8601
  };
}

export interface ReputationUpdatedEvent extends DomainEvent {
  event_type: 'reputation_updated';
  data: {
    user_id: string;
    reputation_score: number; // 0-100
    average_rating: number; // 1-5
    rating_count: number;
    updated_at: string; // ISO8601
  };
}

export interface BadgeEarnedEvent extends DomainEvent {
  event_type: 'badge_earned';
  data: {
    user_id: string;
    badge_id: string;
    badge_name: string;
    earned_at: string; // ISO8601
  };
}

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export interface NotificationCreatedEvent extends DomainEvent {
  event_type: 'notification_created';
  data: {
    notification_id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    action_url?: string;
    created_at: string; // ISO8601
  };
}

export interface NotificationSentEvent extends DomainEvent {
  event_type: 'notification_sent';
  data: {
    notification_id: string;
    user_id: string;
    channel: 'in_app' | 'email' | 'sms' | 'push';
    sent_at: string; // ISO8601
  };
}

export interface NotificationReadEvent extends DomainEvent {
  event_type: 'notification_read';
  data: {
    notification_id: string;
    user_id: string;
    read_at: string; // ISO8601
  };
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export interface EventAnalyzedEvent extends DomainEvent {
  event_type: 'event_analyzed';
  data: {
    user_id: string;
    event_name: string;
    properties: Record<string, any>;
    timestamp: string; // ISO8601
  };
}

export interface MetricRecordedEvent extends DomainEvent {
  event_type: 'metric_recorded';
  data: {
    metric_name: string;
    value: number;
    tags: Record<string, string>;
    timestamp: string; // ISO8601
  };
}

// ============================================================================
// AUDIT EVENTS
// ============================================================================

export interface AuditEventLoggedEvent extends DomainEvent {
  event_type: 'audit_event_logged';
  data: {
    audit_id: string;
    actor_id: string;
    resource_type: string;
    resource_id: string;
    action: string;
    changes: Record<string, any>;
    timestamp: string; // ISO8601
    ip_address: string;
  };
}

// ============================================================================
// Union type for all events
// ============================================================================

export type AllDomainEvents =
  | UserAuthenticatedEvent
  | UserLoggedOutEvent
  | SessionCreatedEvent
  | SessionInvalidatedEvent
  | BrandProfileCreatedEvent
  | CreatorProfileCreatedEvent
  | ProfileUpdatedEvent
  | ProfileCompletedEvent
  | CreatorCategorizedEvent
  | CreatorDiscoverabilityUpdatedEvent
  | CampaignCreatedEvent
  | CampaignPublishedEvent
  | CampaignInvitationSentEvent
  | CreatorViewedInvitationEvent
  | CreatorAcceptedInvitationEvent
  | CreatorDeclinedInvitationEvent
  | CampaignClosedEvent
  | CampaignArchivedEvent
  | DealCreatedEvent
  | NegotiationStartedEvent
  | OfferSubmittedEvent
  | CounterOfferSubmittedEvent
  | NegotiationAcceptedEvent
  | ContractGeneratedEvent
  | ContractSignedEvent
  | DealStatusChangedEvent
  | DealCompletedEvent
  | DealDisputedEvent
  | DealCancelledEvent
  | EscrowCreatedEvent
  | EscrowFundedEvent
  | DeliverableSubmittedEvent
  | DeliverableApprovedEvent
  | DeliverableRejectedEvent
  | EscrowReleasedEvent
  | EscrowRefundedEvent
  | DisputeFiledEvent
  | DisputeResolvedEvent
  | MessageSentEvent
  | MessageDeliveredEvent
  | MessageReadEvent
  | TypingIndicatorStartedEvent
  | TypingIndicatorStoppedEvent
  | RatingSubmittedEvent
  | ReputationUpdatedEvent
  | BadgeEarnedEvent
  | NotificationCreatedEvent
  | NotificationSentEvent
  | NotificationReadEvent
  | EventAnalyzedEvent
  | MetricRecordedEvent
  | AuditEventLoggedEvent;
