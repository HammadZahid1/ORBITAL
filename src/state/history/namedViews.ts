import { isRecord, readNumber, readString } from './serialization';

export interface NamedView<T> {
  name: string;
  state: T;
  savedAt: number;
  lastUsedAt: number;
  uses: number;
}

/** Reusable named snapshots of arbitrary view state, with usage statistics. */
export class NamedViewCollection<T = Record<string, unknown>> {
  private views = new Map<string, NamedView<T>>();

  get size(): number {
    return this.views.size;
  }

  save(name: string, state: T, at = Date.now()): NamedView<T> {
    const view: NamedView<T> = { name, state, savedAt: at, lastUsedAt: at, uses: 0 };
    this.views.set(name, view);
    return { ...view };
  }

  get(name: string): NamedView<T> | null {
    const view = this.views.get(name);
    return view ? { ...view } : null;
  }

  /** Increments the usage counter and returns the stored state, or null when unknown. */
  activate(name: string, at = Date.now()): T | null {
    const view = this.views.get(name);
    if (!view) return null;
    view.uses += 1;
    view.lastUsedAt = at;
    return view.state;
  }

  rename(from: string, to: string): boolean {
    if (from === to || !this.views.has(from) || this.views.has(to)) return false;
    const renamed: Array<[string, NamedView<T>]> = [];
    for (const [name, view] of this.views) {
      renamed.push([name === from ? to : name, name === from ? { ...view, name: to } : view]);
    }
    this.views = new Map(renamed);
    return true;
  }

  has(name: string): boolean {
    return this.views.has(name);
  }

  remove(name: string): boolean {
    return this.views.delete(name);
  }

  names(): string[] {
    return [...this.views.keys()];
  }

  list(): NamedView<T>[] {
    return [...this.views.values()].map((view) => ({ ...view }));
  }

  clear(): void {
    this.views.clear();
  }

  toJSON(): NamedView<T>[] {
    return this.list();
  }

  static fromJSON<T>(data: unknown): NamedViewCollection<T> {
    const collection = new NamedViewCollection<T>();
    if (!Array.isArray(data)) return collection;
    for (const item of data) {
      if (!isRecord(item) || typeof item.name !== 'string' || !('state' in item)) continue;
      const name = readString(item.name);
      collection.views.set(name, {
        name,
        state: item.state as T,
        savedAt: readNumber(item.savedAt),
        lastUsedAt: readNumber(item.lastUsedAt, readNumber(item.savedAt)),
        uses: Math.max(0, Math.floor(readNumber(item.uses))),
      });
    }
    return collection;
  }
}
