/**
 * Event Sourcing Core
 * Foundation for all distributed events across ValueSkins
 */

import { v4 as uuid } from 'uuid';

/**
 * Base event type - ALL events inherit from this
 */
export interface DomainEvent {
  // Identity
  event_id: string;
  event_type: string;
  event_version: number;

  // Aggregate
  aggregate_id: string;
  aggregate_type: string;

  // Causality
  correlation_id: string;
  idempotency_key: string;

  // Timeline
  occurred_at: string; // ISO8601 - when in business time
  recorded_at: string; // ISO8601 - when stored

  // Actor
  actor_id: string; // UUID of who caused this

  // Data
  data: Record<string, any>;
  metadata: {
    ip_address?: string;
    user_agent?: string;
    request_id?: string;
    [key: string]: any;
  };
}

/**
 * Event store interface - implementations vary (PostgreSQL, DynamoDB, etc)
 */
export interface EventStore {
  /**
   * Append event(s) to immutable log
   * Guarantees: idempotency via idempotency_key
   */
  append(events: DomainEvent[]): Promise<void>;

  /**
   * Get all events for an aggregate
   * Used to rebuild state
   */
  getByAggregateId(aggregateId: string): Promise<DomainEvent[]>;

  /**
   * Get events since a certain point (for replaying to offline users)
   */
  getEventsSince(
    afterTimestamp: string,
    filters?: { eventType?: string; aggregateType?: string }
  ): Promise<DomainEvent[]>;

  /**
   * Get single event by ID (for duplicate detection)
   */
  getEventById(eventId: string): Promise<DomainEvent | null>;

  /**
   * Check if idempotency key already processed
   */
  isIdempotent(idempotencyKey: string): Promise<boolean>;
}

/**
 * Event builder - fluent API for creating events
 */
export class EventBuilder {
  private event: Partial<DomainEvent> = {};
  private correlationId: string = uuid();

  constructor(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    actorId: string
  ) {
    this.event = {
      event_id: uuid(),
      event_type: eventType,
      event_version: 1,
      aggregate_id: aggregateId,
      aggregate_type: aggregateType,
      actor_id: actorId,
      correlation_id: this.correlationId,
      occurred_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      data: {},
      metadata: {},
    };
  }

  withCorrelationId(id: string): this {
    this.event.correlation_id = id;
    return this;
  }

  withIdempotencyKey(key: string): this {
    this.event.idempotency_key = key;
    return this;
  }

  withData(data: Record<string, any>): this {
    this.event.data = { ...this.event.data, ...data };
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.event.metadata = { ...this.event.metadata, ...metadata };
    return this;
  }

  withOccurredAt(timestamp: string): this {
    this.event.occurred_at = timestamp;
    return this;
  }

  build(): DomainEvent {
    if (
      !this.event.event_id ||
      !this.event.event_type ||
      !this.event.aggregate_id
    ) {
      throw new Error('Event missing required fields');
    }

    if (!this.event.idempotency_key) {
      // Generate default idempotency key if not provided
      this.event.idempotency_key = `${this.event.aggregate_id}:${this.event.event_type}:${this.event.occurred_at}`;
    }

    return this.event as DomainEvent;
  }
}

/**
 * Event dispatcher - publishes events to subscribers
 */
export interface EventSubscriber {
  onEvent(event: DomainEvent): Promise<void>;
}

export class EventDispatcher {
  private subscribers: Map<string, EventSubscriber[]> = new Map();

  subscribe(eventType: string, subscriber: EventSubscriber): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(subscriber);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    // Dispatch to specific event type subscribers
    const typeSubscribers = this.subscribers.get(event.event_type) || [];

    // Also dispatch to wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*') || [];

    const allSubscribers = [...typeSubscribers, ...wildcardSubscribers];

    // Fire all subscribers in parallel (but track failures)
    const results = await Promise.allSettled(
      allSubscribers.map(s => s.onEvent(event))
    );

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Event subscriber error for ${event.event_type}:`,
          result.reason
        );
      }
    });
  }
}

/**
 * Aggregate root - rebuilds state from events
 */
export abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get uncommitted events and clear them
   */
  getUncommittedEvents(): DomainEvent[] {
    const events = this.uncommittedEvents;
    this.uncommittedEvents = [];
    return events;
  }

  /**
   * Rebuild state from event history
   */
  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this.version++;
    }
  }

  /**
   * Record new event
   */
  recordEvent(event: DomainEvent): void {
    this.applyEvent(event);
    this.uncommittedEvents.push(event);
    this.version++;
  }

  /**
   * Apply event to state
   * Override in subclasses to handle specific events
   */
  protected abstract applyEvent(event: DomainEvent): void;

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }
}

/**
 * Snapshot - performance optimization for large event streams
 */
export interface Snapshot {
  aggregate_id: string;
  aggregate_type: string;
  state: Record<string, any>;
  state_version: number; // event count when snapshot taken
  taken_at: string;
}

/**
 * Snapshot store - manages snapshots
 */
export interface SnapshotStore {
  /**
   * Save snapshot of current state
   */
  save(snapshot: Snapshot): Promise<void>;

  /**
   * Get latest snapshot
   */
  getLatest(aggregateId: string): Promise<Snapshot | null>;

  /**
   * Check if snapshot is "fresh" (recent enough to skip event replaying)
   */
  isFresh(aggregateId: string, threshold?: number): Promise<boolean>;
}

/**
 * Event versioning - handle schema evolution
 */
export interface EventUpgrader {
  getVersion(): number;
  canUpgrade(event: DomainEvent): boolean;
  upgrade(event: DomainEvent): DomainEvent;
}

export class EventUpgraderRegistry {
  private upgraders: Map<string, EventUpgrader[]> = new Map();

  register(eventType: string, upgrader: EventUpgrader): void {
    if (!this.upgraders.has(eventType)) {
      this.upgraders.set(eventType, []);
    }
    this.upgraders.get(eventType)!.push(upgrader);
  }

  upgrade(event: DomainEvent): DomainEvent {
    const upgraders = this.upgraders.get(event.event_type) || [];

    let currentEvent = event;
    for (const upgrader of upgraders) {
      if (upgrader.canUpgrade(currentEvent)) {
        currentEvent = upgrader.upgrade(currentEvent);
      }
    }
    return currentEvent;
  }
}
