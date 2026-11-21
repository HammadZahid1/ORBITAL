/** Typed, priority-aware event bus with wildcard and subscription support. */
import { createSimulationEvent, type CreateEventOptions } from './definitions';
import { matchesFilter, type EventFilter } from './filter';
import { Subscription } from './subscription';
import { finiteNumber, isEventLike, type AnyEventHandler, type EventHandler, type SimulationEvent, type SimulationEventMap, type SimulationEventName } from './types';

export interface SubscribeOptions<K extends SimulationEventName = SimulationEventName> {
  /** Higher priorities are delivered first; ties preserve subscription order. */
  priority?: number;
  filter?: EventFilter<K>;
  once?: boolean;
}

export interface EventBusOptions {
  /** Filter applied to every emission before per-listener filters run. */
  globalFilter?: EventFilter;
}

type ListenerKey = SimulationEventName | '*';
type InternalHandler = (event: SimulationEvent) => void;

interface ListenerRecord {
  key: ListenerKey;
  id: number;
  handler: InternalHandler;
  source: unknown;
  filter?: EventFilter;
  once: boolean;
  priority: number;
  order: number;
  subscription: Subscription;
}

export class EventBus {
  private readonly listeners = new Map<ListenerKey, ListenerRecord[]>();
  private readonly globalFilter?: EventFilter;
  private nextListenerId = 0;

  constructor(options: EventBusOptions = {}) {
    this.globalFilter = options.globalFilter;
  }

  /** Subscribes to one event type. */
  on<K extends SimulationEventName>(
    type: K,
    handler: EventHandler<K>,
    options: SubscribeOptions<K> = {},
  ): Subscription {
    return this.addListener(type, handler as unknown as InternalHandler, handler, options);
  }

  /** Subscribes to one event type, then automatically unsubscribes after delivery. */
  once<K extends SimulationEventName>(
    type: K,
    handler: EventHandler<K>,
    options: SubscribeOptions<K> = {},
  ): Subscription {
    return this.addListener(type, handler as unknown as InternalHandler, handler, { ...options, once: true });
  }

  /** Subscribes to every event type, including future declaration-merged types. */
  onAny(handler: AnyEventHandler, options: SubscribeOptions = {}): Subscription {
    return this.addListener('*', handler, handler, options);
  }

  /** Delivers an event to matching listeners and returns the number invoked. */
  emit<K extends SimulationEventName>(event: SimulationEvent<K>): number {
    if (!isEventLike(event)) return 0;
    if (this.globalFilter && !matchesFilter(this.globalFilter, event)) return 0;

    const specific = this.listeners.get(event.type as SimulationEventName) ?? [];
    const wildcard = this.listeners.get('*') ?? [];
    const ordered = [...specific, ...wildcard].sort((a, b) => {
      const byPriority = b.priority - a.priority;
      return byPriority !== 0 ? byPriority : a.order - b.order;
    });

    let delivered = 0;
    for (const record of ordered) {
      if (!record.subscription.isEnabled()) continue;
      if (record.filter && !matchesFilter(record.filter, event)) continue;
      if (record.once) record.subscription.unsubscribe();
      record.handler(event);
      delivered += 1;
    }
    return delivered;
  }

  /** Builds and emits an event from a payload, returning the emitted event. */
  publish<K extends SimulationEventName>(
    type: K,
    payload: SimulationEventMap[K],
    options: CreateEventOptions = {},
  ): SimulationEvent<K> {
    const event = createSimulationEvent(type, payload, options);
    this.emit(event);
    return event;
  }

  /** Removes a listener previously registered with the same handler identity. */
  off<K extends SimulationEventName>(type: K, handler: EventHandler<K>): boolean {
    const records = this.listeners.get(type) ?? [];
    const target = records.find((record) => record.source === handler);
    if (!target) return false;
    target.subscription.unsubscribe();
    return true;
  }

  /** Clears one type (or everything), disposing outstanding subscription handles. */
  clear(type?: SimulationEventName): void {
    if (type !== undefined) {
      for (const record of this.listeners.get(type) ?? []) record.subscription.dispose();
      this.listeners.delete(type);
      return;
    }
    for (const records of this.listeners.values()) {
      for (const record of records) record.subscription.dispose();
    }
    this.listeners.clear();
  }

  /** Number of enabled listeners, optionally limited to one event type. */
  listenerCount(type?: SimulationEventName): number {
    let count = 0;
    const groups = type === undefined ? [...this.listeners.values()] : [this.listeners.get(type) ?? []];
    for (const records of groups) {
      for (const record of records) if (record.subscription.isEnabled()) count += 1;
    }
    return count;
  }

  /** Event types (plus `'*'`) that currently have listeners. */
  names(): ListenerKey[] {
    return [...this.listeners.keys()];
  }

  private addListener<K extends SimulationEventName>(
    key: ListenerKey,
    handler: InternalHandler,
    source: unknown,
    options: SubscribeOptions<K>,
  ): Subscription {
    this.nextListenerId += 1;
    const record = {
      key,
      id: this.nextListenerId,
      handler,
      source,
      filter: options.filter as unknown as EventFilter | undefined,
      once: options.once === true,
      priority: finiteNumber(options.priority),
      order: this.nextListenerId,
      subscription: undefined as unknown as Subscription,
    } satisfies ListenerRecord;
    const subscription = new Subscription(() => this.removeRecord(record.key, record.id));
    record.subscription = subscription;
    const records = this.listeners.get(key) ?? [];
    records.push(record);
    this.listeners.set(key, records);
    return subscription;
  }

  private removeRecord(key: ListenerKey, id: number): void {
    const records = this.listeners.get(key);
    if (!records) return;
    const next = records.filter((record) => record.id !== id);
    if (next.length === 0) this.listeners.delete(key);
    else this.listeners.set(key, next);
  }
}
