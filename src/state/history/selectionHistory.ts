import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export interface SelectionEntry {
  id: string;
  at: number;
}

export interface SelectionHistoryState {
  entries: SelectionEntry[];
  cursor: number;
}

/** Browser-style back/forward history for the currently selected body. */
export class SelectionHistory {
  readonly capacity: number;
  private entries: SelectionEntry[] = [];
  private cursor = -1;

  constructor(capacity = 50) {
    this.capacity = clampCapacity(capacity, 50);
  }

  get size(): number {
    return this.entries.length;
  }

  get current(): string | null {
    return this.entries[this.cursor]?.id ?? null;
  }

  get canGoBack(): boolean {
    return this.cursor > 0;
  }

  get canGoForward(): boolean {
    return this.cursor >= 0 && this.cursor < this.entries.length - 1;
  }

  /** Re-selecting the current id only refreshes its timestamp; going back then selecting discards the future. */
  select(id: string, at = Date.now()): void {
    if (this.current === id) {
      this.entries[this.cursor] = { id, at };
      return;
    }
    if (this.canGoForward) this.entries.length = this.cursor + 1;
    this.entries.push({ id, at });
    if (this.entries.length > this.capacity) this.entries.shift();
    this.cursor = this.entries.length - 1;
  }

  back(): string | null {
    if (!this.canGoBack) return null;
    this.cursor -= 1;
    return this.current;
  }

  forward(): string | null {
    if (!this.canGoForward) return null;
    this.cursor += 1;
    return this.current;
  }

  toArray(): SelectionEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  toJSON(): SelectionHistoryState {
    return { entries: this.toArray(), cursor: this.cursor };
  }

  restore(state: SelectionHistoryState): void {
    this.entries = state.entries.slice(-this.capacity).map((entry) => ({ ...entry }));
    this.cursor = Math.max(-1, Math.min(this.entries.length - 1, state.cursor));
  }

  clear(): void {
    this.entries = [];
    this.cursor = -1;
  }

  static fromJSON(data: unknown, capacity?: number): SelectionHistory {
    const history = new SelectionHistory(capacity);
    if (!isRecord(data)) return history;
    const entries: SelectionEntry[] = [];
    if (Array.isArray(data.entries)) {
      for (const item of data.entries) {
        if (!isRecord(item) || typeof item.id !== 'string') continue;
        entries.push({ id: readString(item.id), at: readNumber(item.at) });
      }
    }
    const cursor = readNumber(data.cursor, -1);
    history.restore({ entries, cursor: Number.isInteger(cursor) ? cursor : -1 });
    return history;
  }
}
