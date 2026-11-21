import { clampCapacity, isRecord, isStringArray, readNumber, readString } from './serialization';

export interface FilterCriterion {
  id: string;
  query: string;
  fields: string[];
  appliedAt: number;
}

function sameFields(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((field, index) => field === b[index]);
}

/** Bounded history of applied filter expressions with consecutive deduplication. */
export class FilterHistory {
  readonly capacity: number;
  private entries: FilterCriterion[] = [];
  private sequence = 0;

  constructor(capacity = 20) {
    this.capacity = clampCapacity(capacity, 20);
  }

  get size(): number {
    return this.entries.length;
  }

  apply(query: string, fields: readonly string[] = [], at = Date.now()): FilterCriterion {
    const last = this.entries.at(-1);
    if (last && last.query === query && sameFields(last.fields, fields)) {
      const updated: FilterCriterion = { ...last, appliedAt: at };
      this.entries[this.entries.length - 1] = updated;
      return { ...updated, fields: [...updated.fields] };
    }
    this.sequence += 1;
    const entry: FilterCriterion = {
      id: `filter-${this.sequence}`,
      query,
      fields: [...fields],
      appliedAt: at,
    };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
    return { ...entry, fields: [...entry.fields] };
  }

  latest(): FilterCriterion | null {
    const entry = this.entries.at(-1);
    return entry ? { ...entry, fields: [...entry.fields] } : null;
  }

  /** Zero is the latest entry, one is the previous entry, and so on. */
  recall(stepsBack = 1): FilterCriterion | null {
    if (stepsBack < 0 || !Number.isFinite(stepsBack)) return null;
    const entry = this.entries[this.entries.length - 1 - Math.floor(stepsBack)];
    return entry ? { ...entry, fields: [...entry.fields] } : null;
  }

  remove(id: string): boolean {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) return false;
    this.entries = next;
    return true;
  }

  list(): FilterCriterion[] {
    return this.entries.map((entry) => ({ ...entry, fields: [...entry.fields] }));
  }

  clear(): void {
    this.entries = [];
  }

  toJSON(): FilterCriterion[] {
    return this.list();
  }

  static fromJSON(data: unknown, capacity?: number): FilterHistory {
    const history = new FilterHistory(capacity);
    if (!Array.isArray(data)) return history;
    for (const item of data) {
      if (!isRecord(item) || typeof item.query !== 'string') continue;
      history.sequence += 1;
      history.entries.push({
        id: readString(item.id, `filter-${history.sequence}`),
        query: readString(item.query),
        fields: isStringArray(item.fields) ? [...item.fields] : [],
        appliedAt: readNumber(item.appliedAt),
      });
    }
    history.entries = history.entries.slice(-history.capacity);
    history.sequence = Math.max(
      history.sequence,
      ...history.entries.map((entry) => {
        const match = /^filter-(\d+)$/.exec(entry.id);
        return match ? Number(match[1]) : 0;
      }),
    );
    return history;
  }
}
