import { isRecord, readBoolean } from './serialization';

export interface ChangeSet {
  changed: boolean;
  added: string[];
  removed: string[];
  modified: string[];
}

function equalsDeep(a: unknown, b: unknown, seen: WeakMap<object, WeakSet<object>>): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const left = a as object;
  const right = b as object;
  let visited = seen.get(left);
  if (visited?.has(right)) return true;
  if (!visited) {
    visited = new WeakSet<object>();
    seen.set(left, visited);
  }
  visited.add(right);

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!equalsDeep(left[i], right[i], seen)) return false;
    }
    return true;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!equalsDeep(leftRecord[key], rightRecord[key], seen)) return false;
  }
  return true;
}

/** Structural equality for acyclic or cyclic plain objects, arrays and primitives. */
export function structuralEquals(a: unknown, b: unknown): boolean {
  return equalsDeep(a, b, new WeakMap<object, WeakSet<object>>());
}

/** Reports added, removed and modified keys between two flat records. */
export function diffKeys<T>(
  previous: Readonly<Record<string, T>>,
  next: Readonly<Record<string, T>>,
  compare?: (a: T, b: T) => boolean,
): ChangeSet {
  const equals = compare ?? Object.is;
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const key of Object.keys(next)) {
    if (!Object.prototype.hasOwnProperty.call(previous, key)) added.push(key);
    else if (!equals(previous[key], next[key])) modified.push(key);
  }
  for (const key of Object.keys(previous)) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) removed.push(key);
  }
  return { changed: added.length + removed.length + modified.length > 0, added, removed, modified };
}

/** Remembers the last observed value and reports whether it actually changed. */
export class ChangeDetector<T> {
  private hasLast = false;
  private lastValue: T | undefined;
  private readonly equals: (a: T, b: T) => boolean;

  constructor(equals?: (a: T, b: T) => boolean) {
    this.equals = equals ?? structuralEquals;
  }

  get observed(): boolean {
    return this.hasLast;
  }

  get last(): T | undefined {
    return this.lastValue;
  }

  observe(value: T): boolean {
    const changed = !this.hasLast || !this.equals(value, this.lastValue as T);
    this.lastValue = value;
    this.hasLast = true;
    return changed;
  }

  reset(): void {
    this.hasLast = false;
    this.lastValue = undefined;
  }

  toJSON(): { hasLast: boolean; last: T | null } {
    return { hasLast: this.hasLast, last: this.hasLast ? (this.lastValue as T) : null };
  }

  load(data: unknown): void {
    if (!isRecord(data)) {
      this.reset();
      return;
    }
    this.hasLast = readBoolean(data.hasLast) && Object.prototype.hasOwnProperty.call(data, 'last');
    this.lastValue = this.hasLast ? (data.last as T) : undefined;
  }

  static fromJSON<T>(data: unknown, equals?: (a: T, b: T) => boolean): ChangeDetector<T> {
    const detector = new ChangeDetector<T>(equals);
    detector.load(data);
    return detector;
  }
}
