/** Bounded, deterministically ordered history of emitted simulation events. */
import { isEventLike, positiveInt, type SimulationEvent, type SimulationEventName } from './types';

export interface EventTimelineOptions {
  capacity?: number;
}

function compareEvents(a: SimulationEvent, b: SimulationEvent): number {
  if (a.time !== b.time) return a.time - b.time;
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export class EventTimeline {
  readonly capacity: number;
  private events: SimulationEvent[] = [];

  constructor(options: EventTimelineOptions = {}) {
    this.capacity = positiveInt(options.capacity, 256, 100_000);
  }

  get size(): number {
    return this.events.length;
  }

  /** Inserts an event in (time, sequence) order; oldest entries are evicted. */
  record(event: SimulationEvent): boolean {
    if (!isEventLike(event)) return false;
    const index = this.insertionIndex(event);
    this.events.splice(index, 0, event);
    if (this.events.length > this.capacity) this.events.shift();
    return true;
  }

  recordAll(events: readonly SimulationEvent[]): number {
    let recorded = 0;
    for (const event of events) if (this.record(event)) recorded += 1;
    return recorded;
  }

  /** Inclusive range on simulation time. Non-finite bounds match nothing. */
  between(startTime: number, endTime: number): SimulationEvent[] {
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return [];
    return this.events.filter((event) => event.time >= startTime && event.time <= endTime);
  }

  after(time: number, inclusive = false): SimulationEvent[] {
    if (!Number.isFinite(time)) return [];
    return this.events.filter((event) => (inclusive ? event.time >= time : event.time > time));
  }

  before(time: number, inclusive = false): SimulationEvent[] {
    if (!Number.isFinite(time)) return [];
    return this.events.filter((event) => (inclusive ? event.time <= time : event.time < time));
  }

  atTime(time: number, tolerance = 0): SimulationEvent[] {
    if (!Number.isFinite(time)) return [];
    const band = Math.max(0, Number.isFinite(tolerance) ? tolerance : 0);
    return this.events.filter((event) => Math.abs(event.time - time) <= band);
  }

  byType<K extends SimulationEventName>(type: K): SimulationEvent<K>[] {
    return this.events.filter((event) => event.type === type) as SimulationEvent<K>[];
  }

  first(): SimulationEvent | null {
    return this.events[0] ?? null;
  }

  last(): SimulationEvent | null {
    return this.events[this.events.length - 1] ?? null;
  }

  latest(count = 10): SimulationEvent[] {
    if (!Number.isFinite(count) || count <= 0) return [];
    return this.events.slice(-Math.floor(count));
  }

  toArray(): SimulationEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  private insertionIndex(event: SimulationEvent): number {
    let low = 0;
    let high = this.events.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compareEvents(this.events[middle], event) <= 0) low = middle + 1;
      else high = middle;
    }
    return low;
  }
}
