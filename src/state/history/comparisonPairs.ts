import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export interface ComparisonPair {
  a: string;
  b: string;
  createdAt: number;
}

/** Canonical, order-independent key for an unordered pair of ids. */
export function comparisonKey(a: string, b: string): string {
  return JSON.stringify([a, b].sort());
}

/** Tracks distinct, unordered body pairs selected for side-by-side comparison. */
export class ComparisonPairTracker {
  readonly capacity: number;
  private pairs: ComparisonPair[] = [];

  constructor(capacity = 4) {
    this.capacity = clampCapacity(capacity, 4);
  }

  get size(): number {
    return this.pairs.length;
  }

  has(a: string, b: string): boolean {
    const key = comparisonKey(a, b);
    return this.pairs.some((pair) => comparisonKey(pair.a, pair.b) === key);
  }

  /** Returns null for self-pairs and duplicates. */
  create(a: string, b: string, at = Date.now()): ComparisonPair | null {
    if (a === b || this.has(a, b)) return null;
    const pair: ComparisonPair = { a, b, createdAt: at };
    this.pairs.push(pair);
    if (this.pairs.length > this.capacity) this.pairs.shift();
    return { ...pair };
  }

  /** Returns true when the pair is present after the call. */
  toggle(a: string, b: string, at = Date.now()): boolean {
    if (this.remove(a, b)) return false;
    return this.create(a, b, at) !== null;
  }

  remove(a: string, b: string): boolean {
    const key = comparisonKey(a, b);
    const next = this.pairs.filter((pair) => comparisonKey(pair.a, pair.b) !== key);
    if (next.length === this.pairs.length) return false;
    this.pairs = next;
    return true;
  }

  contains(id: string): boolean {
    return this.pairs.some((pair) => pair.a === id || pair.b === id);
  }

  partnersOf(id: string): string[] {
    const partners: string[] = [];
    for (const pair of this.pairs) {
      if (pair.a === id) partners.push(pair.b);
      else if (pair.b === id) partners.push(pair.a);
    }
    return partners;
  }

  list(): ComparisonPair[] {
    return this.pairs.map((pair) => ({ ...pair }));
  }

  clear(): void {
    this.pairs = [];
  }

  toJSON(): ComparisonPair[] {
    return this.list();
  }

  static fromJSON(data: unknown, capacity?: number): ComparisonPairTracker {
    const tracker = new ComparisonPairTracker(capacity);
    if (!Array.isArray(data)) return tracker;
    for (const item of data) {
      if (!isRecord(item) || typeof item.a !== 'string' || typeof item.b !== 'string' || item.a === item.b) continue;
      tracker.create(readString(item.a), readString(item.b), readNumber(item.createdAt));
    }
    return tracker;
  }
}
