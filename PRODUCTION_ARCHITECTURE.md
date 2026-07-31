# ValueSkins Production Architecture
## A Complete Distributed System Design for Global Scale

**Status:** Foundation Architecture (Production-Ready from Day 1)  
**Scope:** Complete platform design covering all domains, realtime, scalability, reliability  
**Target Scale:** 100s of brands, 10,000s of creators, millions of campaigns, thousands of concurrent users globally  
**Design Principle:** Event-driven, backend-authoritative, single source of truth  

---

# PART 1: System Overview

## Core Philosophy

```
ValueSkins is not:
- A frontend with a backend
- A database with an API
- A set of isolated features

ValueSkins IS:
- One unified distributed system
- Event-driven workflow orchestration engine
- Real-time marketplace for creator-brand collaboration
- Immutable audit trail of all business events
- State machine for deal lifecycle management
```

## Three Layers (Not Six)

```
┌─────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER                                      │
│ (Web, Mobile, Desktop - all same backend)               │
│ - React/Next.js (web)                                   │
│ - React Native/Swift/Kotlin (mobile)                    │
│ - Electron (desktop)                                    │
│ Role: Display cache, not make decisions                 │
└─────────────────────────────────────────────────────────┘
                           ↑↓
                   (realtime subscriptions)
                           ↑↓
┌─────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (The Brain)                           │
│ - Event-driven orchestration                            │
│ - Workflow engines                                      │
│ - State machines                                        │
│ - Business rules                                        │
│ - Authorization checks                                  │
│ - Domain services                                       │
│ Role: Make all decisions, publish events                │
└─────────────────────────────────────────────────────────┘
                           ↑↓
                    (commands & events)
                           ↑↓
┌─────────────────────────────────────────────────────────┐
│ PERSISTENCE LAYER (The Record)                          │
│ - PostgreSQL (primary database)                         │
│ - Event sourcing store                                  │
│ - Read models (denormalized views)                      │
│ - Audit trail                                           │
│ - Immutable event log                                   │
│ Role: Store only what happened, not opinions            │
└─────────────────────────────────────────────────────────┘
```

---

# PART 2: Bounded Contexts (Domain-Driven Design)

## Context Map

```
┌──────────────────────────────────────────────────────────────────┐
│                    ValueSkins Platform                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ AUTHENTICATION  │  │ USER MANAGEMENT  │  │ VALUESKIN ENGINE │
│  │ ───────────────│  │ ─────────────────│  │ ────────────────│
│  │ • OAuth        │  │ • Brand profiles │  │ • Skin types   │
│  │ • JWT tokens   │  │ • Creator       │  │ • Matching     │
│  │ • Sessions     │  │   profiles      │  │ • Discovery    │
│  │ • MFA          │  │ • Preferences   │  │                │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘
│
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ CAMPAIGN ENGINE  │  │ NEGOTIATION      │  │ CONTRACT ENGINE  │
│  │ ──────────────── │  │ ──────────────── │  │ ────────────────│
│  │ • Create        │  │ • Offer flow     │  │ • Generation   │
│  │ • Publish       │  │ • Counter offers │  │ • E-signature  │
│  │ • Target        │  │ • Terms         │  │ • Versioning   │
│  │ • Lifecycle     │  │ • Price points  │  │ • Milestones   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ ESCROW           │  │ MESSAGING        │  │ REPUTATION       │
│  │ ──────────────── │  │ ──────────────── │  │ ────────────────│
│  │ • Funding       │  │ • Deal chat      │  │ • Ratings       │
│  │ • Release       │  │ • Notifications  │  │ • Reviews       │
│  │ • Refund        │  │ • Delivery acks  │  │ • Trust score   │
│  │ • Disputes      │  │ • Typing status  │  │ • Badges        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ SEARCH & DISCOVERY
│  │ ──────────────── │  │ ANALYTICS        │  │ AUDIT & COMPLIANCE
│  │ • Indexing      │  │ ──────────────── │  │ ────────────────│
│  │ • Full-text     │  │ • Event tracking │  │ • Event log    │
│  │ • Filters       │  │ • User behavior  │  │ • Immutable    │
│  │ • Sorting       │  │ • Metrics        │  │ • Compliance   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│
└──────────────────────────────────────────────────────────────────┘

All contexts communicate via:
- Events (asynchronous, immutable, ordered)
- Commands (synchronous, validated, authorized)
- Queries (read-only, eventually consistent)
```

## Context Responsibilities

### Authentication Context
- OAuth flow management
- JWT token generation/validation
- Session lifecycle
- MFA handling
- Emits: `UserAuthenticated`, `UserLoggedOut`, `SessionCreated`

### User Management Context
- Brand profile management
- Creator profile management
- Preferences & settings
- Availability calendar
- Emits: `BrandProfileUpdated`, `CreatorProfileUpdated`, `PreferencesChanged`

### ValueSkin Engine Context
- ValueSkin type definitions (Type 1, 2, 3)
- Creator-to-ValueSkin matching
- Discovery recommendations
- Skill/niche tagging
- Emits: `CreatorCategorized`, `SkinMatched`, `RecommendationGenerated`

### Campaign Engine Context
- Campaign creation & publication
- Targeting logic (by ValueSkin, location, etc.)
- Campaign lifecycle (open → closed → archived)
- Invitation generation
- Emits: `CampaignCreated`, `CampaignPublished`, `InvitationSent`, `CampaignClosed`

### Negotiation Context
- Offer/counter-offer flow
- Price negotiation
- Terms discussion
- Agreement on deliverables
- Emits: `OfferSubmitted`, `CounterOfferSubmitted`, `NegotiationClosed`

### Contract Engine Context
- Legal contract generation
- E-signature integration
- Version control
- Milestone tracking
- Emits: `ContractGenerated`, `ContractSigned`, `MilestoneReached`

### Escrow Context
- Payment holding
- Release conditions
- Refund handling
- Dispute resolution
- Emits: `EscrowCreated`, `EscrowFunded`, `EscrowReleased`, `DisputeFiled`

### Messaging Context
- Deal-specific chat
- Message ordering
- Delivery acknowledgement
- Typing indicators
- Emits: `MessageSent`, `MessageDelivered`, `MessageRead`

### Reputation Context
- Rating collection
- Review storage
- Trust score calculation
- Badge assignment
- Emits: `RatingSubmitted`, `ReputationUpdated`, `BadgeEarned`

### Search & Discovery Context
- Full-text search indexing
- Recommendation engine
- Filter & sort logic
- Trending calculations
- Emits: `CreatorIndexed`, `CampaignIndexed`, `SearchQueryExecuted`

### Analytics Context
- Event capture
- Metrics aggregation
- User behavior tracking
- Funnel analysis
- Emits: `EventAnalyzed`, `MetricRecorded`

### Audit & Compliance Context
- Immutable event logging
- Legal hold tracking
- Compliance report generation
- Data residency enforcement
- Emits: `AuditEventLogged`, `ComplianceCheckExecuted`

---

# PART 3: Event-Driven Architecture

## Complete Event Catalog

### Authentication Events
```
UserAuthenticated
  user_id: UUID
  auth_provider: 'google' | 'github' | 'email'
  login_timestamp: ISO8601
  ip_address: string
  user_agent: string

UserLoggedOut
  user_id: UUID
  session_id: UUID
  logout_timestamp: ISO8601

SessionCreated
  session_id: UUID
  user_id: UUID
  expires_at: ISO8601
  device_info: object
```

### User Profile Events
```
BrandProfileCreated
  brand_id: UUID
  name: string
  industry: string
  location: string
  website: string

CreatorProfileCreated
  creator_id: UUID
  name: string
  valueSkins: string[] (Type 1, Type 2, Type 3)
  location: string
  portfolio_links: string[]

ProfileCompleted
  user_id: UUID
  profile_type: 'brand' | 'creator'
  completion_percentage: number
```

### Campaign Events
```
CampaignCreated
  campaign_id: UUID
  brand_id: UUID
  title: string
  description: string
  target_valueSkins: string[]
  budget: number
  currency: string
  deadline: ISO8601
  created_at: ISO8601

CampaignPublished
  campaign_id: UUID
  published_at: ISO8601
  eligible_creators_count: number

InvitationSent
  invitation_id: UUID
  campaign_id: UUID
  creator_id: UUID
  sent_at: ISO8601

CreatorViewedInvitation
  invitation_id: UUID
  campaign_id: UUID
  creator_id: UUID
  viewed_at: ISO8601

CreatorAcceptedInvitation
  invitation_id: UUID
  campaign_id: UUID
  creator_id: UUID
  accepted_at: ISO8601

CreatorDeclinedInvitation
  invitation_id: UUID
  campaign_id: UUID
  creator_id: UUID
  declined_at: ISO8601
  reason: string

CampaignClosed
  campaign_id: UUID
  closed_at: ISO8601
  reason: 'completed' | 'cancelled' | 'expired'
```

### Deal Negotiation Events
```
NegotiationStarted
  deal_id: UUID
  campaign_id: UUID
  brand_id: UUID
  creator_id: UUID
  started_at: ISO8601

OfferSubmitted
  deal_id: UUID
  offer_id: UUID
  submitted_by: 'brand' | 'creator'
  deliverables: object
  price: number
  terms: string
  submitted_at: ISO8601

CounterOfferSubmitted
  deal_id: UUID
  counter_offer_id: UUID
  submitted_by: 'brand' | 'creator'
  changes: object
  submitted_at: ISO8601

NegotiationAccepted
  deal_id: UUID
  final_offer_id: UUID
  accepted_by: 'brand' | 'creator'
  accepted_at: ISO8601
```

### Escrow Events
```
EscrowCreated
  escrow_id: UUID
  deal_id: UUID
  brand_id: UUID
  creator_id: UUID
  amount: number
  currency: string
  created_at: ISO8601

EscrowFunded
  escrow_id: UUID
  transaction_id: string
  funded_at: ISO8601
  payment_method: 'card' | 'bank_transfer' | 'wallet'

DeliverableSubmitted
  deal_id: UUID
  escrow_id: UUID
  creator_id: UUID
  deliverables_url: string
  submitted_at: ISO8601

EscrowReleased
  escrow_id: UUID
  deal_id: UUID
  released_by: 'brand' | 'admin'
  released_at: ISO8601
  amount: number

DisputeFiled
  escrow_id: UUID
  deal_id: UUID
  filed_by: 'brand' | 'creator'
  reason: string
  filed_at: ISO8601

DisputeResolved
  dispute_id: UUID
  escrow_id: UUID
  resolution: 'released_to_creator' | 'refunded_to_brand' | 'split'
  resolved_at: ISO8601
```

### Messaging Events
```
MessageSent
  message_id: UUID
  deal_id: UUID
  sender_id: UUID
  recipient_id: UUID
  body: string
  attachments: object[] (optional)
  sent_at: ISO8601

MessageDelivered
  message_id: UUID
  delivered_at: ISO8601
  delivered_to: UUID

MessageRead
  message_id: UUID
  read_by: UUID
  read_at: ISO8601

TypingIndicatorStarted
  deal_id: UUID
  user_id: UUID
  started_at: ISO8601

TypingIndicatorStopped
  deal_id: UUID
  user_id: UUID
  stopped_at: ISO8601
```

### Reputation Events
```
RatingSubmitted
  rating_id: UUID
  deal_id: UUID
  rated_by: UUID
  rated_user: UUID
  rating: 1..5
  review_text: string (optional)
  submitted_at: ISO8601

ReputationUpdated
  user_id: UUID
  new_reputation_score: number (0-100)
  rating_count: number
  average_rating: number
  updated_at: ISO8601

BadgeEarned
  user_id: UUID
  badge_id: string
  badge_name: string
  earned_at: ISO8601
```

### Notification Events
```
NotificationCreated
  notification_id: UUID
  user_id: UUID
  type: string (campaign_invitation, message, payment, etc.)
  title: string
  body: string
  action_url: string
  created_at: ISO8601

NotificationSent
  notification_id: UUID
  channel: 'in_app' | 'email' | 'sms' | 'push'
  sent_at: ISO8601

NotificationRead
  notification_id: UUID
  read_at: ISO8601
```

### Analytics Events
```
EventAnalyzed
  event_type: string
  user_id: UUID
  properties: object
  timestamp: ISO8601

FunnelStepCompleted
  funnel_id: string
  step: number
  user_id: UUID
  completed_at: ISO8601

MetricRecorded
  metric_name: string
  value: number
  tags: object
  timestamp: ISO8601
```

### Audit Events
```
AuditEventLogged
  audit_id: UUID
  event_type: string
  actor_id: UUID (who did this)
  resource_type: string (campaign, deal, etc.)
  resource_id: UUID
  action: string (create, update, delete, etc.)
  changes: object (what changed)
  timestamp: ISO8601
  ip_address: string
```

## Event Properties (All Events MUST Have)

```
Every event MUST include:
- event_id: UUID (unique, immutable)
- event_type: string (CampaignCreated, etc.)
- aggregate_id: UUID (campaign_id, deal_id, etc.)
- aggregate_type: string (campaign, deal, etc.)
- event_version: number (1, for schema versioning)
- timestamp: ISO8601 (when it happened)
- actor_id: UUID (who caused this)
- correlation_id: UUID (trace across system)
- idempotency_key: string (prevent duplicates)
- metadata: object (context, user_agent, ip_address, etc.)

Every event is:
- Immutable (never changed after creation)
- Ordered (sequence number per aggregate)
- Persistent (stored forever in event log)
- Typed (schema validated)
- Replayed (can recreate any state from events)
```

---

# PART 4: State Machines

## Campaign Lifecycle

```
States:
- draft          (created, not published)
- published      (visible to creators)
- in_progress    (creator accepted, work in progress)
- review         (awaiting brand review of deliverables)
- completed      (deliverables accepted, escrow released)
- cancelled      (brand cancelled)
- archived       (old campaign, no new applications)

Transitions:
draft → published
  Event: CampaignPublished
  Preconditions: title, description, budget, deadline all set
  Action: Generate eligible invitations
  
published → in_progress
  Event: CreatorAcceptedInvitation
  Preconditions: creator accepted invitation
  Action: Create deal, setup escrow
  
in_progress → review
  Event: DeliverableSubmitted
  Preconditions: creator submitted deliverables
  Action: Notify brand of submission
  
review → completed
  Event: EscrowReleased
  Preconditions: brand approved + escrow funded
  Action: Transfer funds to creator
  
review → in_progress
  Event: BrandRequestedRevisions
  Preconditions: brand rejected deliverables
  Action: Notify creator of changes needed
  
(any) → cancelled
  Event: CampaignCancelled
  Preconditions: brand initiated cancellation
  Action: Issue refund if escrow was funded
  
published → archived
  Event: CampaignExpired
  Preconditions: deadline passed
  Action: Stop accepting new applications
  
diagram:
         ┌─────────┐
         │  draft  │
         └────┬────┘
              │ CampaignPublished
              ↓
         ┌──────────┐
         │published │◄──┐
         └────┬─────┘   │ BrandRequestedRevisions
              │         │
              │ CreatorAcceptedInvitation
              ↓
         ┌──────────────┐
         │ in_progress  │──────┐
         └────┬─────────┘      │
              │                │
              │ DeliverableSubmitted
              ↓
          ┌────────┐
          │ review │
          └────┬───┘
          ┌────┴─────────┐
          │              │
    EscrowReleased   Refunded
          │              │
          ↓              ↓
      ┌─────────┐  ┌──────────┐
      │completed│  │ refunded │
      └─────────┘  └──────────┘
          
(any) → cancelled (on CampaignCancelled)
(any) → archived (on CampaignExpired)
```

## Deal Lifecycle

```
States:
- negotiation    (offer/counter-offer phase)
- contract_pending (contract generated, awaiting signatures)
- signed         (contract signed by both parties)
- in_progress    (work is happening)
- review         (deliverables submitted, awaiting review)
- completed      (all work accepted and paid)
- disputed       (payment disputed)
- cancelled      (deal cancelled by either party)

Transitions:
negotiation → contract_pending
  Event: NegotiationAccepted
  Preconditions: both agreed on terms
  Action: Generate contract, request signatures
  
contract_pending → signed
  Event: ContractSigned
  Preconditions: both parties signed
  Action: Setup escrow, notify creator to start work
  
signed → in_progress
  Event: EscrowFunded
  Preconditions: brand transferred funds to escrow
  Action: Notify creator to begin deliverables
  
in_progress → review
  Event: DeliverableSubmitted
  Preconditions: creator submitted work
  Action: Notify brand to review
  
review → completed
  Event: EscrowReleased
  Preconditions: brand approved work
  Action: Transfer funds, notify creator
  
review → in_progress
  Event: BrandRequestedRevisions
  Preconditions: brand rejected work
  Action: Creator has 3 days to revise
  
(any) → disputed
  Event: DisputeFiled
  Preconditions: either party filed dispute
  Action: Alert admin, freeze escrow
  
disputed → completed
  Event: DisputeResolved
  Preconditions: admin or arbitration decided
  Action: Release or refund funds accordingly
  
(signed|in_progress|review) → cancelled
  Event: DealCancelled
  Preconditions: cancellation initiated
  Action: Refund escrow, end relationship
```

## Negotiation Lifecycle

```
States:
- initiated      (brand sent initial offer)
- counter_pending (creator submitted counter)
- responded      (brand responded to counter)
- accepted       (both agreed)
- expired        (deadline passed without agreement)
- declined       (one party declined)

Transitions:
initiated → counter_pending
  Event: CounterOfferSubmitted
  Preconditions: creator submitted counter
  Action: Notify brand of counter
  
initiated → declined
  Event: OfferDeclined
  Preconditions: creator rejected offer
  Action: End negotiation
  
counter_pending → responded
  Event: CounterOfferResponded
  Preconditions: brand counter-countered or accepted
  Action: Notify creator
  
responded → counter_pending
  Event: CounterOfferSubmitted
  Preconditions: creator submitted another counter
  Action: Notify brand
  
responded → accepted
  Event: OfferAccepted
  Preconditions: both agreed
  Action: Move to contract phase
  
(initiated|counter_pending|responded) → expired
  Event: NegotiationExpired
  Preconditions: 7-day timeout
  Action: Notify both parties
```

---

# PART 5: Data Model (Event Sourcing)

## Core Tables

### events_log (Immutable Event Store)
```sql
CREATE TABLE events_log (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR NOT NULL,
  event_version INT NOT NULL,
  
  -- Immutable data
  data JSONB NOT NULL,
  metadata JSONB NOT NULL (includes ip_address, user_agent, etc.),
  
  -- Tracking
  actor_id UUID NOT NULL (who caused this),
  correlation_id UUID NOT NULL (trace id),
  idempotency_key VARCHAR UNIQUE (prevent duplicates),
  
  -- Timing
  occurred_at TIMESTAMP NOT NULL (when in business time),
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW() (when stored),
  
  -- Indexing
  created_at_block BIGINT NOT NULL (for ordering guarantees),
  
  -- Constraints
  FOREIGN KEY (actor_id) REFERENCES auth.users(id),
  CHECK (event_version >= 1)
);

-- Critical indexes
CREATE INDEX ON events_log(aggregate_id, aggregate_type);
CREATE INDEX ON events_log(event_type);
CREATE INDEX ON events_log(actor_id);
CREATE INDEX ON events_log(occurred_at);
CREATE INDEX ON events_log(correlation_id);
CREATE INDEX ON events_log(idempotency_key);
```

### Snapshots (Performance Optimization)
```sql
CREATE TABLE event_snapshots (
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR NOT NULL,
  
  -- Current state
  state JSONB NOT NULL,
  state_version BIGINT NOT NULL,
  
  -- Snapshot metadata
  taken_at TIMESTAMP NOT NULL DEFAULT NOW(),
  event_count_since_snapshot INT NOT NULL,
  
  PRIMARY KEY (aggregate_id, aggregate_type),
  CHECK (state_version >= 0),
  CHECK (event_count_since_snapshot >= 0)
);

-- Rebuild snapshots when event_count > 100
```

### User Event Pointers (Track Progress)
```sql
CREATE TABLE user_event_pointers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Replay tracking (for offline users)
  last_processed_event_id UUID,
  last_processed_at TIMESTAMP,
  
  -- Subscription state
  subscribed_channels TEXT[] (array of channel names),
  subscribed_at TIMESTAMP,
  
  -- Presence
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP,
  
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Subscriptions (Realtime Routing)
```sql
CREATE TABLE subscriptions (
  subscription_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- What they're subscribed to
  channel_type VARCHAR NOT NULL (campaign, deal, notification, etc),
  channel_id UUID NOT NULL,
  
  -- Filtering
  event_types TEXT[] NOT NULL (array of event types to receive),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  last_heartbeat TIMESTAMP,
  
  UNIQUE (user_id, channel_type, channel_id)
);

CREATE INDEX ON subscriptions(user_id);
CREATE INDEX ON subscriptions(channel_type, channel_id);
```

### Read Models (Denormalized Views)
```sql
-- Example: Campaign View (denormalized from events)
CREATE TABLE campaigns_view (
  campaign_id UUID PRIMARY KEY,
  brand_id UUID NOT NULL,
  
  -- Current state (rebuilt from events)
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR NOT NULL (draft, published, completed, etc),
  
  target_valueSkins VARCHAR[] NOT NULL,
  budget DECIMAL NOT NULL,
  deadline TIMESTAMP NOT NULL,
  
  creator_count INT DEFAULT 0,
  invitation_count INT DEFAULT 0,
  application_count INT DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL,
  published_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Metadata
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  event_version BIGINT NOT NULL (which event rebuilt this)
);

-- Rebuild on every event: CampaignCreated, InvitationSent, CreatorAcceptedInvitation, etc.
```

---

# PART 6: Command-Query Responsibility Segregation (CQRS)

## Commands (Write Path)

### Campaign Commands
```
CreateCampaignCommand
  brand_id: UUID
  title: string
  description: string
  target_valueSkins: string[]
  budget: number
  deadline: ISO8601
  
  Handler:
    1. Validate brand exists
    2. Validate budget > 0
    3. Validate deadline in future
    4. Emit: CampaignCreated
    5. Return: campaign_id

PublishCampaignCommand
  campaign_id: UUID
  brand_id: UUID
  
  Handler:
    1. Load campaign (from events)
    2. Validate status = draft
    3. Calculate eligible creators
    4. Emit: CampaignPublished
    5. Schedule: GenerateInvitations task
    6. Return: eligible_creators_count

AcceptInvitationCommand
  invitation_id: UUID
  campaign_id: UUID
  creator_id: UUID
  
  Handler:
    1. Load invitation (from events)
    2. Validate invitation not expired
    3. Validate creator_id matches
    4. Emit: CreatorAcceptedInvitation
    5. Trigger: CreateDealWorkflow
    6. Return: deal_id
```

### Deal Commands
```
SubmitOfferCommand
  campaign_id: UUID
  creator_id: UUID
  deliverables: object
  price: number
  
  Handler:
    1. Validate deliverables non-empty
    2. Validate price > 0
    3. Emit: OfferSubmitted
    4. Notify brand in realtime
    5. Return: offer_id

SubmitCounterOfferCommand
  deal_id: UUID
  submitted_by: 'brand' | 'creator'
  counter_offer: object
  
  Handler:
    1. Load deal (from events)
    2. Validate deal in negotiation
    3. Validate counter changes made
    4. Emit: CounterOfferSubmitted
    5. Notify other party in realtime
    6. Return: counter_offer_id

AcceptOfferCommand
  deal_id: UUID
  offer_id: UUID
  
  Handler:
    1. Load deal (from events)
    2. Load offer (from events)
    3. Validate offer not expired
    4. Emit: NegotiationAccepted
    5. Trigger: GenerateContractWorkflow
    6. Return: contract_id
```

### Escrow Commands
```
FundEscrowCommand
  escrow_id: UUID
  brand_id: UUID
  amount: number
  payment_method: 'card' | 'bank_transfer'
  
  Handler:
    1. Validate escrow status = created
    2. Process payment (external)
    3. On success: Emit: EscrowFunded
    4. On failure: Emit: EscrowFundingFailed
    5. Return: transaction_id or error

ReleaseEscrowCommand
  escrow_id: UUID
  deal_id: UUID
  released_by: 'brand' | 'admin'
  
  Handler:
    1. Load escrow (from events)
    2. Load deal (from events)
    3. Validate deal status = review
    4. Validate brand approved deliverables
    5. Emit: EscrowReleased
    6. Transfer to creator (payment processor)
    7. Emit: PaymentTransferred
    8. Return: transaction_id
```

## Queries (Read Path)

### Campaign Queries
```
GetCampaignQuery(campaign_id)
  Handler:
    1. Check snapshots table
    2. If fresh: Return from snapshot
    3. If stale: Load events since last snapshot
    4. Rebuild state
    5. Update snapshot
    6. Return: Campaign object

GetCampaignsForCreatorQuery(creator_id, filters?, sort?)
  Handler:
    1. Load creator profile (from events)
    2. Get creator's valueSkins
    3. Query campaigns_view table
      WHERE target_valueSkins CONTAINS creator_valueSkins
      AND status = 'published'
      AND deadline > NOW()
    4. Apply filters (location, budget, deadline)
    5. Apply sorting (newest, budget, deadline)
    6. Return: paginated Campaign list

SearchCampaignsQuery(search_term, filters?)
  Handler:
    1. Query elasticsearch/postgres full-text search
    2. Apply filters
    3. Return: ranked Campaign list

GetCreatorRecommendationsQuery(brand_id, campaign_id)
  Handler:
    1. Load campaign (from events)
    2. Run recommendation engine
      - Match valueSkins
      - Check reputation
      - Check availability
      - Check pricing
    3. Return: ranked Creator list
```

### Deal Queries
```
GetDealQuery(deal_id)
  Handler:
    1. Load all events for deal_id
    2. Rebuild deal state
    3. Return: Deal object with current state

GetDealChatQuery(deal_id)
  Handler:
    1. Query messages table
      WHERE deal_id = ? ORDER BY created_at
    2. Include delivery status
    3. Include read status
    4. Return: Message list

GetCreatorDealsQuery(creator_id)
  Handler:
    1. Find all deals where creator_id = ?
    2. Group by status
    3. Sort by updated_at DESC
    4. Return: Deal list by status

GetBrandDealsQuery(brand_id, campaign_id)
  Handler:
    1. Find all deals for brand's campaigns
    2. Filter by campaign if provided
    3. Group by status
    4. Return: Deal list
```

---

# PART 7: Workflows & Orchestration

## Create Campaign Workflow

```
1. User clicks "Create Campaign" button
   ↓
2. Frontend: POST /api/campaigns (CommandCreateCampaign)
   - Campaign title, description, budget, deadline
   - Target valueSkins, location, etc.
   ↓
3. Backend: Validate command
   - Authenticate: is user a brand? ✓
   - Authorize: brand can create campaigns ✓
   - Validate: title non-empty, budget > 0, deadline in future ✓
   ↓
4. Database: BEGIN TRANSACTION
   ↓
5. Emit event: CampaignCreated
   - Store in events_log table
   - Set event_id, correlation_id, idempotency_key
   ↓
6. Update read model: campaigns_view
   - INSERT campaign with status='draft'
   ↓
7. Publish event to realtime
   - supabase.realtime.publish('brand_123_campaigns', CampaignCreated)
   ↓
8. COMMIT TRANSACTION
   ↓
9. Backend returns: campaign_id
   ↓
10. Frontend: Show confirmation
    - "Campaign created"
    - Redirect to campaign detail page

Idempotency:
- If same CreateCampaignCommand sent twice (network retry)
- idempotency_key = hash(brand_id, title, deadline, timestamp_truncated_to_minute)
- Second request: Check if event with same idempotency_key exists
- If exists: Return same campaign_id (no duplicate created)
```

## Publish Campaign Workflow

```
1. User clicks "Publish Campaign"
   ↓
2. Frontend: POST /api/campaigns/{id}/publish
   ↓
3. Backend: Validate command
   - Campaign status = draft
   - All required fields filled
   ↓
4. Calculate eligible creators
   - Query creators_view
   - WHERE valueSkins CONTAINS campaign.targetValueSkins
   - Result: 500 creators eligible
   ↓
5. Database: BEGIN TRANSACTION
   ↓
6. Emit event: CampaignPublished
   - correlation_id (trace this workflow)
   - eligible_creators_count: 500
   ↓
7. Update read model: campaigns_view
   - UPDATE status = 'published'
   - UPDATE published_at = NOW()
   ↓
8. Emit 500 events: InvitationGenerated (async task)
   - For each eligible creator:
     - Emit: InvitationSent(campaign_id, creator_id, invitation_id)
     - Store in events_log
     - Create subscription: creator subscribes to 'campaign_123_updates'
   ↓
9. Publish event to realtime
   - supabase.realtime.publish('campaign_123_updates', CampaignPublished)
   - Broadcast to brand: "Campaign published to 500 creators"
   ↓
10. Emit 500 events: CreatorNotified (for each creator)
    - supabase.realtime.publish('creator_456_notifications', InvitationSent)
    - Creator sees: "New campaign: Summer Product Launch"
    ↓
11. COMMIT TRANSACTION
    ↓
12. Update search index (async)
    - Add campaign to elasticsearch
    - Tag with valueSkins, location, budget
    ↓
13. Record analytics (async)
    - emit: EventAnalyzed('campaign_published', brand_id, {eligible_creators_count: 500})
```

## Creator Accepts Invitation Workflow

```
1. Creator views campaign in feed
   - Realtime subscription to 'campaigns_for_valueSkin_UGC_Creator'
   - Sees: "Summer Product Launch - ₹50,000 budget"
   ↓
2. Creator clicks "Accept"
   ↓
3. Frontend: POST /api/campaigns/{id}/accept
   ↓
4. Backend: Validate
   - Creator exists
   - Campaign status = published
   - Invitation exists and not expired
   - Creator hasn't already applied
   ↓
5. Database: BEGIN TRANSACTION
   ↓
6. Emit event: CreatorAcceptedInvitation
   - campaign_id, creator_id, deal_id (new)
   - timestamp
   ↓
7. Create deal (from Campaign + Creator)
   - Emit event: DealCreated
   - Set status = 'negotiation'
   ↓
8. Create subscription: creator subscribes to 'deal_123_updates'
   ↓
9. Create subscription: brand subscribes to 'campaign_123_updates'
   - (if not already subscribed)
   ↓
10. Update read models:
    - UPDATE campaigns_view SET application_count += 1
    - INSERT deals_view (new deal)
   ↓
11. Publish events to realtime:
    - supabase.realtime.publish('brand_123_notifications', CreatorAcceptedInvitation)
      Brand sees: "Creator XYZ accepted your campaign invitation"
    - supabase.realtime.publish('deal_123_chat', DealCreated)
      Both see: "Deal created, ready to negotiate"
   ↓
12. Emit notification event: NotificationCreated
    - Type: 'creator_accepted'
    - User: brand_id
    - Message: "Creator XYZ accepted your campaign"
    ↓
13. COMMIT TRANSACTION
    ↓
14. Frontend: Navigate to deal chat
    - Creator and brand can now message
    - Both see: "Let's discuss deliverables"
```

---

# PART 8: Realtime Infrastructure

## Subscription Model

```
What creators subscribe to (on login):
- campaigns_for_valueSkin_UGC_Creator (campaigns targeting their type)
- campaigns_for_location_pune (campaigns in their location)
- creator_123_notifications (personal notifications)
- presence_channel (who's online)

What brands subscribe to (on login):
- brand_123_campaigns (updates on my campaigns)
- brand_123_notifications (personal notifications)
- campaign_456_applications (who's applying to this campaign)

What both subscribe to (in deal chat):
- deal_789_chat (messages in this deal)
- deal_789_updates (deal status changes)
- deal_789_presence (who's viewing this deal)

Authorization (checked at subscription time):
- Creator can only subscribe to campaigns matching their valueSkin
- Creator cannot subscribe to other creator's DMs
- Brand can only see their own campaigns and applications
- Admin can subscribe to anything
```

## Message Flow

```
1. Creator sends message in deal chat
   POST /api/deals/789/messages
   {
     body: "Hi, what's the budget for additional rights?",
     deal_id: 789
   }
   
2. Backend validates
   - Authenticated? ✓
   - Is participant in deal? ✓
   - Message non-empty? ✓
   - Rate limited? (max 50 messages/hour) ✓

3. Database: BEGIN TRANSACTION

4. Emit event: MessageSent
   - message_id (UUID)
   - deal_id, sender_id, body
   - timestamp

5. Store in events_log (immutable)

6. Update read model: messages_view
   - INSERT message with status='sent'

7. Publish to realtime:
   supabase.realtime.publish('deal_789_chat', {
     type: 'message_sent',
     message_id: 'msg_123',
     sender_id: 'creator_456',
     body: "Hi, what's the budget...",
     timestamp: NOW()
   })

8. COMMIT TRANSACTION

9. Brand receives event via WebSocket
   - Message appears in chat (realtime)
   - No refresh needed
   - Latency: 50-200ms

10. Frontend emits: MessageDelivered
    - Browser received message
    
11. Backend: Emit event MessageDelivered
    - Store in events_log

12. Publish to realtime:
    supabase.realtime.publish('deal_789_chat', {
      type: 'message_delivered',
      message_id: 'msg_123',
      delivered_at: NOW()
    })

13. Creator's UI shows checkmark (✓ delivered)

14. Brand clicks on message to read it

15. Frontend emits: MessageRead
    - User read the message

16. Backend: Emit event MessageRead
    - Store in events_log

17. Publish to realtime:
    supabase.realtime.publish('deal_789_chat', {
      type: 'message_read',
      message_id: 'msg_123',
      read_by: 'brand_123',
      read_at: NOW()
    })

18. Creator sees double checkmark (✓✓ read)

Timeline:
t=0:    Creator sends message
t=50:   Brand receives (WebSocket)
t=100:  Brand sees message delivered
t=500:  Brand reads message
t=550:  Creator sees read status
```

## Offline User Reconnection

```
Timeline: Creator offline 8 hours
- Closed app 8:00 AM
- Reopened app 4:00 PM

On reconnection:

1. Frontend authenticates with backend
   - OAuth token valid? ✓
   
2. Frontend subscribes to realtime channels
   - creator_456_notifications
   - campaigns_for_valueSkin_UGC_Creator
   - deal_789_chat (if in a deal)
   
3. Backend: Get user's event pointer
   - Query: user_event_pointers WHERE user_id = creator_456
   - last_processed_at = 8:00 AM
   
4. Backend: Query missed events
   - SELECT * FROM events_log
   - WHERE (
       aggregate_type IN ('notification', 'campaign', 'message')
       AND (
         aggreg

ate_id IN (creator's subscriptions)
         OR (type LIKE 'creator_%' AND actor_id = creator_456)
       )
     )
     AND occurred_at > '8:00 AM'
   - Result: 12 missed events
   
5. Backend: Emit replay events
   For each missed event:
   - supabase.realtime.publish('creator_456_notifications', event)
   
   Creator sees (in order):
   - "Brand liked your portfolio"
   - "New campaign: Fall Fashion Launch"
   - "Messages: 3 new messages from Brand XYZ"
   - "Payment received: ₹25,000"
   
6. Update pointer: last_processed_at = NOW()

7. Subscribe to live updates
   - Creator now receives real-time updates as they happen
   - Brand sends new message → Creator sees immediately
```

---

# PART 9: Scalability Architecture

## Single Server → Multi-Region (Evolution)

### Stage 1: Single Instance (0-100 concurrent)
```
┌─────────────────────────┐
│  Next.js (Vercel)       │
│  • API routes           │
│  • Supabase Realtime    │
└─────────────────────────┘
         │
         ↓
    PostgreSQL (Supabase)
```

### Stage 2: Load Balanced (100-1000 concurrent)
```
┌──────────────────┐
│ Load Balancer    │
└────────┬─────────┘
    ┌───┼───┐
    │   │   │
┌───▼─┐ ┌─▼────┐ ┌────▼──┐
│ API │ │ API  │ │ API   │
│ 1   │ │ 2    │ │ 3     │
└─────┘ └──────┘ └───────┘
    │   │   │
    └───┼───┘
        │
    ┌───┴────────┐
    │   Redis    │
    │  Pub/Sub   │
    └────────────┘
        │
    PostgreSQL (Supabase)
```

### Stage 3: Multi-Region (1000+ concurrent)
```
Region 1: India
┌──────────────────┐
│ Load Balancer    │
└────────┬─────────┘
    ┌───┼───┐
    │ API  │ API  │ API  │
    └─────┴──────┘
        │
    Redis (India)

Region 2: US
┌──────────────────┐
│ Load Balancer    │
└────────┬─────────┘
    ┌───┼───┐
    │ API  │ API  │ API  │
    └─────┴──────┘
        │
    Redis (US)

Region 3: EU
┌──────────────────┐
│ Load Balancer    │
└────────┬─────────┘
    ┌───┼───┐
    │ API  │ API  │ API  │
    └─────┴──────┘
        │
    Redis (EU)

        ↓↓↓

Global Event Bus (Kafka)
        ↓↓↓

Primary PostgreSQL (US)
Read Replicas (India, EU)
```

## Connection Management

```
How to handle 10,000 concurrent WebSocket connections:

1. Connection pooling
   - Each server holds max 3000 connections
   - Round-robin load balancer routes new connections
   - Sticky sessions: creator_456 always → server A (if alive)

2. Heartbeat mechanism
   - Every 30 seconds: server sends heartbeat
   - If client doesn't respond: drop connection
   - Client reconnects automatically

3. Graceful shutdown
   - When server going down: close new connections
   - Existing connections get "server restarting" message
   - Clients reconnect to other servers

4. Memory management
   - Per connection: ~50KB
   - 3000 connections = ~150MB per server
   - 10 servers = ~1.5GB total (acceptable)

5. CPU management
   - Event broadcasting: distribute to all connections
   - Use Redis pub/sub to avoid N broadcasts per server
   - Each server only broadcasts to its connected clients
```

## Database Scaling

```
Single PostgreSQL → Cluster

Stage 1: Single instance (up to 1000 concurrent reads/sec)
- Supabase default: sufficient

Stage 2: Read replicas (1000-10,000 concurrent)
- Primary in US (writes)
- Read replica in India (reads)
- Read replica in EU (reads)
- Replication lag: 50-500ms (acceptable for eventual consistency)

Stage 3: Sharding (10,000+ concurrent)
- Shard by brand_id or creator_id
- Database 1: Brands A-M
- Database 2: Brands N-Z
- Application layer routes queries to correct shard
- Cross-shard queries? Use materialized views (stale but consistent)
```

---

# PART 10: Security & Compliance

## Authentication Flow

```
1. User clicks "Login with Google"
   ↓
2. Frontend: OAuth redirect to Google
   ↓
3. Google: User logs in, redirect back with auth_code
   ↓
4. Frontend: POST /api/auth/callback?code=xyz
   ↓
5. Backend:
   - Send code to Google API
   - Get access_token + id_token
   - Extract user_id + email from id_token
   - Check if user exists in database
   ↓
6. If new user:
   - Create user record
   - Create profile (brand or creator)
   - Emit: UserAuthenticated event
   ↓
7. Generate JWT token
   - Header: { alg: "RS256", kid: "key_123" }
   - Payload: { user_id, role, exp: +30min }
   - Sign with private key
   ↓
8. Return JWT + refresh token
   - JWT in Authorization header (Bearer token)
   - Refresh token in HttpOnly cookie
   ↓
9. Frontend: Store JWT in memory (not localStorage)
   - Include in every API call
   ↓
10. Backend: Verify JWT on every request
    - Check signature (using public key)
    - Check expiry
    - Check user still active (not banned)
```

## Authorization (Row-Level Security)

```
SQL Policies:

-- Creators can only see campaigns targeting their valueSkins
create policy "creators_see_eligible_campaigns" on campaigns
  for select
  using (
    target_valueSkins && (
      select valueSkins from creator_profiles
      where user_id = auth.uid()
    )
  );

-- Creators can only see their own deals
create policy "creators_see_own_deals" on deals
  for select
  using (creator_id = auth.uid());

-- Brands can only see their own campaigns
create policy "brands_see_own_campaigns" on campaigns
  for select
  using (brand_id = auth.uid());

-- Admins can see everything
create policy "admins_see_all" on campaigns
  for select
  using (auth.role() = 'admin');
```

## Payment Security

```
Never store credit card data:
- Use Stripe (PCI-DSS compliant)
- Create Stripe payment intent
- Collect card on frontend
- Stripe tokenizes card
- Backend only knows card token, not full card
- Stripe handles vault + encryption

On escrow release:
- Backend verifies: deal status = review
- Backend verifies: brand authorized release
- Call Stripe: transfer_to_creator(amount, creator_stripe_account)
- Emit: EscrowReleased
- Emit: PaymentTransferred
```

## Audit Trail

```
Every action logged:

INSERT INTO audit_logs (
  audit_id, user_id, action, resource_type, resource_id,
  before_state, after_state, timestamp, ip_address
)
VALUES (...)

Examples:
- user_123 created campaign_456 (2026-07-31 14:30:00, 192.168.1.1)
- user_456 accepted invitation_789 for campaign_456 (2026-07-31 14:35:00, 203.0.113.5)
- user_123 released escrow for deal_789 (2026-07-31 15:00:00, 192.168.1.1)

Immutable: No updates, only inserts
Retention: Forever (or legal hold if dispute)
Access: Only admins can read
Purpose: Prove what happened in case of dispute
```

---

# PART 11: Implementation Roadmap

## Phase 1: Foundation (Weeks 1-4)

- [ ] Create event sourcing infrastructure
  - [ ] events_log table
  - [ ] event snapshot strategy
  - [ ] event replay system
  
- [ ] Implement domain events
  - [ ] Define all 50+ event types
  - [ ] Create event DTOs (TypeScript)
  - [ ] Event versioning strategy
  
- [ ] Build command handlers
  - [ ] CreateCampaignCommand
  - [ ] PublishCampaignCommand
  - [ ] AcceptInvitationCommand
  
- [ ] Implement read models
  - [ ] campaigns_view table
  - [ ] deals_view table
  - [ ] Build materialization logic

## Phase 2: Realtime (Weeks 5-8)

- [ ] Set up Supabase Realtime (already configured)
- [ ] Implement subscriptions table
- [ ] Build subscription management API
- [ ] Implement offline replay system
- [ ] Add heartbeat/reconnection logic

## Phase 3: Workflows (Weeks 9-12)

- [ ] Orchestration engine (saga pattern)
- [ ] Implement all workflow steps
- [ ] Add idempotency checks
- [ ] Error handling + retries

## Phase 4: Security (Weeks 13-16)

- [ ] RLS policies for all tables
- [ ] Authorization middleware
- [ ] Audit logging infrastructure
- [ ] Payment processing integration

## Phase 5: Scalability (Weeks 17-20)

- [ ] Redis pub/sub setup
- [ ] Connection management
- [ ] Database read replicas
- [ ] Load balancer config

## Phase 6: Testing (Weeks 21-24)

- [ ] Load testing (1000+ concurrent)
- [ ] Chaos testing (network partitions)
- [ ] Duplicate event testing
- [ ] Offline replay testing

---

# PART 12: Summary

This architecture is designed to:
✅ Handle realtime at scale (thousands concurrent)
✅ Scale globally (multi-region)
✅ Maintain audit trail (immutable events)
✅ Ensure consistency (ACID transactions)
✅ Support offline users (event replay)
✅ Enable mobile apps (same backend)
✅ Allow future services (event-driven)

It is NOT:
❌ Frontend-focused
❌ REST-only
❌ Polling-based
❌ Eventually consistent everywhere
❌ Vertically scalable only

This is production-ready architecture for a global SaaS.
