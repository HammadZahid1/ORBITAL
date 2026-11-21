/** Per-key throttling in simulation-time units, with optional trailing delivery. */
import { isEventLike, positiveInt, type SimulationEvent } from './types';

export interface ThrottledEmitterOptions {
  /** Minimum simulation-time separation between accepted emissions. */
  interval?: number;
  /** Groups events into independent throttle windows; defaults to event type. */
  key?: (event: SimulationEvent) => string;
  /** Emit the first event of a window. Always enabled for interval <= 0. */
  leading?: boolean;
  /** Keep the latest suppressed event for an explicit `flush()`. */
  trailing?: boolean;
}

export class ThrottledEmitter {
  private readonly interval: number;
  private readonly keyOf: (event: SimulationEvent) => string;
  private readonly leading: boolean;
  private readonly trailing: boolean;
  private readonly lastAccepted = new Map<string, number>();
  private readonly pending = new Map<string, SimulationEvent>();

  constructor(
    private readonly sink: (event: SimulationEvent) => void,
    options: ThrottledEmitterOptions = {},
  ) {
    const source = typeof options.interval === 'number' && Number.isFinite(options.interval) ? options.interval : 0;
    this.interval = Math.max(0, source);
    this.keyOf = options.key ?? ((event) => event.type);
    this.leading = options.leading !== false;
    this.trailing = options.trailing === true;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  /** Last accepted event time for a key, or null when the key is unseen. */
  lastAcceptedAt(key: string): number | null {
    return this.lastAccepted.get(key) ?? null;
  }

  /** Returns true when the event was emitted immediately. */
  tryEmit(event: SimulationEvent): boolean {
    if (!isEventLike(event)) return false;
    const key = this.keyOf(event);
    const keyString = typeof key === 'string' && key.length > 0 ? key : event.type;
    const last = this.lastAccepted.get(keyString);

    if (this.interval <= 0 || last === undefined || event.time - last >= this.interval) {
      this.lastAccepted.set(keyString, Math.max(last ?? Number.NEGATIVE_INFINITY, event.time));
      this.pending.delete(keyString);
      if (this.leading) this.sink(event);
      return true;
    }

    if (this.trailing) this.pending.set(keyString, event);
    return false;
  }

  /** Emits the most recent suppressed event for each key and clears them. */
  flush(): number {
    let emitted = 0;
    for (const [key, event] of this.pending) {
      this.lastAccepted.set(key, Math.max(this.lastAccepted.get(key) ?? Number.NEGATIVE_INFINITY, event.time));
      this.sink(event);
      emitted += 1;
    }
    this.pending.clear();
    return emitted;
  }

  reset(): void {
    this.lastAccepted.clear();
    this.pending.clear();
  }
}

/** Helper for large, deterministic time buckets without floating-point drift. */
export function bucketKey(event: SimulationEvent, width: number): string {
  const step = positiveInt(width, 1, 1_000_000);
  return `${event.type}:${Math.floor(event.time / step)}`;
}
