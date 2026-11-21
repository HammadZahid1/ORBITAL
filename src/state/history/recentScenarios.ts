import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export interface RecentScenario {
  id: string;
  visits: number;
  lastVisitedAt: number;
}

/** Most-recently-visited scenario ids, with visit counts and no duplicates. */
export class RecentScenarioTracker {
  readonly capacity: number;
  private entries: RecentScenario[] = [];

  constructor(capacity = 8) {
    this.capacity = clampCapacity(capacity, 8);
  }

  get size(): number {
    return this.entries.length;
  }

  /** Records a visit, moving an existing scenario to the front. */
  visit(id: string, at = Date.now()): RecentScenario {
    const existing = this.entries.find((entry) => entry.id === id);
    if (existing) {
      existing.visits += 1;
      existing.lastVisitedAt = at;
      this.entries = [existing, ...this.entries.filter((entry) => entry !== existing)];
      return existing;
    }
    const entry: RecentScenario = { id, visits: 1, lastVisitedAt: at };
    this.entries.unshift(entry);
    if (this.entries.length > this.capacity) this.entries.length = this.capacity;
    return entry;
  }

  has(id: string): boolean {
    return this.entries.some((entry) => entry.id === id);
  }

  get(id: string): RecentScenario | null {
    return this.entries.find((entry) => entry.id === id) ?? null;
  }

  ids(): string[] {
    return this.entries.map((entry) => entry.id);
  }

  remove(id: string): boolean {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) return false;
    this.entries = next;
    return true;
  }

  clear(): void {
    this.entries = [];
  }

  toJSON(): RecentScenario[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  static fromJSON(data: unknown, capacity?: number): RecentScenarioTracker {
    const tracker = new RecentScenarioTracker(capacity);
    if (!Array.isArray(data)) return tracker;
    for (const item of data) {
      if (!isRecord(item) || typeof item.id !== 'string') continue;
      const id = readString(item.id);
      if (tracker.has(id)) continue;
      tracker.entries.push({
        id,
        visits: Math.max(1, Math.floor(readNumber(item.visits, 1))),
        lastVisitedAt: readNumber(item.lastVisitedAt),
      });
    }
    tracker.entries.length = Math.min(tracker.entries.length, tracker.capacity);
    return tracker;
  }
}
