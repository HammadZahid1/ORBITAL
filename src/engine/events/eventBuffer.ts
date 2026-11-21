/** Bounded FIFO buffer that can replay events into a bus. */
import type { EventBus } from './eventBus';
import { matchesFilter, type EventFilter } from './filter';
import { isEventLike, positiveInt, type SimulationEvent } from './types';

export interface EventBufferOptions {
  capacity?: number;
  filter?: EventFilter;
}

export class EventBuffer {
  readonly capacity: number;
  readonly filter?: EventFilter;
  private events: SimulationEvent[] = [];
  private droppedCount = 0;

  constructor(options: EventBufferOptions = {}) {
    this.capacity = positiveInt(options.capacity, 64, 100_000);
    this.filter = options.filter;
  }

  get size(): number {
    return this.events.length;
  }

  get dropped(): number {
    return this.droppedCount;
  }

  /** Accepts finite, matching events; a full buffer evicts its oldest item. */
  push(event: SimulationEvent): boolean {
    if (!isEventLike(event)) return false;
    if (this.filter && !matchesFilter(this.filter, event)) return false;
    this.events.push(event);
    if (this.events.length > this.capacity) {
      this.events.shift();
      this.droppedCount += 1;
    }
    return true;
  }

  peek(): SimulationEvent | null {
    return this.events[0] ?? null;
  }

  at(index: number): SimulationEvent | null {
    return Number.isInteger(index) && index >= 0 && index < this.events.length ? this.events[index] : null;
  }

  toArray(): SimulationEvent[] {
    return [...this.events];
  }

  /** Returns all buffered events in insertion order and empties the buffer. */
  drain(): SimulationEvent[] {
    const pending = this.events;
    this.events = [];
    return pending;
  }

  /** Replays buffered events into a bus and returns how many were replayed. */
  flushTo(bus: EventBus): number {
    const pending = this.drain();
    for (const event of pending) bus.emit(event);
    return pending.length;
  }

  clear(): void {
    this.events = [];
  }

  reset(): void {
    this.clear();
    this.droppedCount = 0;
  }

  static fromEvents(events: readonly SimulationEvent[], options: EventBufferOptions = {}): EventBuffer {
    const buffer = new EventBuffer(options);
    for (const event of events) buffer.push(event);
    return buffer;
  }
}
