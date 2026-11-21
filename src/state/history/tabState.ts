import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export interface TabStateEntry<T> {
  key: string;
  state: T;
  updatedAt: number;
}

/** Least-recently-used memory of per-tab workspace state, such as scroll offsets. */
export class TabStateMemory<T = Record<string, unknown>> {
  readonly capacity: number;
  private tabs = new Map<string, TabStateEntry<T>>();

  constructor(capacity = 12) {
    this.capacity = clampCapacity(capacity, 12);
  }

  get size(): number {
    return this.tabs.size;
  }

  remember(key: string, state: T, at = Date.now()): TabStateEntry<T> {
    if (this.tabs.has(key)) this.tabs.delete(key);
    const entry: TabStateEntry<T> = { key, state, updatedAt: at };
    this.tabs.set(key, entry);
    if (this.tabs.size > this.capacity) {
      const oldest = this.tabs.keys().next().value;
      if (oldest !== undefined) this.tabs.delete(oldest);
    }
    return { ...entry };
  }

  entry(key: string): TabStateEntry<T> | null {
    const entry = this.tabs.get(key);
    return entry ? { ...entry } : null;
  }

  recall(key: string): T | null {
    return this.entry(key)?.state ?? null;
  }

  has(key: string): boolean {
    return this.tabs.has(key);
  }

  forget(key: string): boolean {
    return this.tabs.delete(key);
  }

  keys(): string[] {
    return [...this.tabs.keys()];
  }

  list(): TabStateEntry<T>[] {
    return [...this.tabs.values()].map((entry) => ({ ...entry }));
  }

  clear(): void {
    this.tabs.clear();
  }

  toJSON(): TabStateEntry<T>[] {
    return this.list();
  }

  static fromJSON<T>(data: unknown, capacity?: number): TabStateMemory<T> {
    const memory = new TabStateMemory<T>(capacity);
    if (!Array.isArray(data)) return memory;
    for (const item of data) {
      if (!isRecord(item) || typeof item.key !== 'string' || !('state' in item)) continue;
      memory.tabs.set(readString(item.key), {
        key: readString(item.key),
        state: item.state as T,
        updatedAt: readNumber(item.updatedAt),
      });
    }
    while (memory.tabs.size > memory.capacity) {
      const oldest = memory.tabs.keys().next().value;
      if (oldest === undefined) break;
      memory.tabs.delete(oldest);
    }
    return memory;
  }
}
