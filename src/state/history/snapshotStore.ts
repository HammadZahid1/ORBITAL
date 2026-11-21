import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export interface Snapshot<T> {
  id: string;
  value: T;
  createdAt: number;
}

/**
 * Bounded collection of state snapshots, oldest first. Values are stored by
 * reference, so callers should pass immutable or freshly cloned objects.
 */
export class SnapshotStore<T> {
  readonly capacity: number;
  private entries: Snapshot<T>[] = [];

  constructor(capacity = 20) {
    this.capacity = clampCapacity(capacity, 20);
  }

  get size(): number {
    return this.entries.length;
  }

  push(value: T, id: string, createdAt = Date.now()): Snapshot<T> {
    const snapshot: Snapshot<T> = { id, value, createdAt };
    this.entries.push(snapshot);
    if (this.entries.length > this.capacity) this.entries.shift();
    return snapshot;
  }

  latest(): Snapshot<T> | null {
    return this.entries.at(-1) ?? null;
  }

  /** Index zero is the oldest retained snapshot. */
  at(index: number): Snapshot<T> | null {
    return this.entries[index] ?? null;
  }

  find(id: string): Snapshot<T> | null {
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      if (this.entries[i].id === id) return this.entries[i];
    }
    return null;
  }

  values(): T[] {
    return this.entries.map((entry) => entry.value);
  }

  clear(): void {
    this.entries = [];
  }

  toJSON(): Snapshot<T>[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  restore(entries: readonly Snapshot<T>[]): void {
    this.entries = entries.slice(-this.capacity).map((entry) => ({ ...entry }));
  }

  static fromJSON<T>(data: unknown, capacity?: number): SnapshotStore<T> {
    const store = new SnapshotStore<T>(capacity);
    if (!Array.isArray(data)) return store;
    const parsed: Snapshot<T>[] = [];
    for (const item of data) {
      if (!isRecord(item) || typeof item.id !== 'string' || !('value' in item)) continue;
      parsed.push({ id: readString(item.id), value: item.value as T, createdAt: readNumber(item.createdAt) });
    }
    store.restore(parsed);
    return store;
  }
}
