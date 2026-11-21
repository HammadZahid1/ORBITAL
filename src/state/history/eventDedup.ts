import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export interface DedupRecord<T> {
  key: string;
  value: T;
  at: number;
}

/** Keeps the first accepted event of each key inside a sliding time window. */
export class EventDeduplicator<T = unknown> {
  readonly windowMs: number;
  readonly maxKeys: number;
  private records = new Map<string, DedupRecord<T>>();

  constructor(windowMs = 1000, maxKeys = 256) {
    this.windowMs = Math.max(0, readNumber(windowMs, 1000));
    this.maxKeys = clampCapacity(maxKeys, 256);
  }

  get size(): number {
    return this.records.size;
  }

  /** Suppressed (duplicate) events do not extend the window. */
  accept(key: string, value: T, at = Date.now()): boolean {
    const previous = this.records.get(key);
    if (previous && at - previous.at < this.windowMs) return false;
    this.remember(key, value, at);
    return true;
  }

  /** Checks the window without updating or pruning state. */
  isDuplicate(key: string, at = Date.now()): boolean {
    const previous = this.records.get(key);
    return previous !== undefined && at - previous.at < this.windowMs;
  }

  get(key: string): DedupRecord<T> | null {
    const record = this.records.get(key);
    return record ? { ...record } : null;
  }

  has(key: string): boolean {
    return this.records.has(key);
  }

  keys(): string[] {
    return [...this.records.keys()];
  }

  forget(key: string): boolean {
    return this.records.delete(key);
  }

  /** Removes expired keys and returns how many were dropped. */
  prune(at = Date.now()): number {
    let removed = 0;
    for (const [key, record] of this.records) {
      if (at - record.at >= this.windowMs) {
        this.records.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.records.clear();
  }

  toJSON(): DedupRecord<T>[] {
    return [...this.records.values()].map((record) => ({ ...record }));
  }

  static fromJSON<T>(data: unknown, windowMs?: number, maxKeys?: number): EventDeduplicator<T> {
    const dedup = new EventDeduplicator<T>(windowMs, maxKeys);
    if (!Array.isArray(data)) return dedup;
    for (const item of data) {
      if (!isRecord(item) || typeof item.key !== 'string' || !('value' in item)) continue;
      dedup.remember(readString(item.key), item.value as T, readNumber(item.at));
    }
    return dedup;
  }

  private remember(key: string, value: T, at: number): void {
    if (!this.records.has(key) && this.records.size >= this.maxKeys) {
      let oldestKey: string | null = null;
      let oldestAt = Infinity;
      for (const [candidate, record] of this.records) {
        if (record.at < oldestAt) {
          oldestAt = record.at;
          oldestKey = candidate;
        }
      }
      if (oldestKey !== null) this.records.delete(oldestKey);
    }
    this.records.set(key, { key, value, at });
  }
}
