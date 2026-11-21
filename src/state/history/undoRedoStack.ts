import { clampCapacity, isRecord } from './serialization';

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Linear present-state history with bounded undo depth and redo support. */
export class UndoRedoStack<T> {
  readonly limit: number;
  private past: T[] = [];
  private presentValue: T;
  private future: T[] = [];

  constructor(initial: T, limit = 50) {
    this.presentValue = initial;
    this.limit = clampCapacity(limit, 50);
  }

  get current(): T {
    return this.presentValue;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get undoDepth(): number {
    return this.past.length;
  }

  get redoDepth(): number {
    return this.future.length;
  }

  commit(next: T): void {
    this.past.push(this.presentValue);
    if (this.past.length > this.limit) this.past.shift();
    this.presentValue = next;
    this.future = [];
  }

  /** Returns the new present, or null when there is nothing to undo. */
  undo(): T | null {
    if (this.past.length === 0) return null;
    this.future.unshift(this.presentValue);
    this.presentValue = this.past.pop() as T;
    return this.presentValue;
  }

  /** Returns the new present, or null when there is nothing to redo. */
  redo(): T | null {
    if (this.future.length === 0) return null;
    this.past.push(this.presentValue);
    if (this.past.length > this.limit) this.past.shift();
    this.presentValue = this.future.shift() as T;
    return this.presentValue;
  }

  /** Keeps the present value but discards both stacks. */
  clear(): void {
    this.past = [];
    this.future = [];
  }

  toJSON(): UndoRedoState<T> {
    return { past: [...this.past], present: this.presentValue, future: [...this.future] };
  }

  static fromJSON<T>(data: unknown, fallback: T, limit?: number): UndoRedoStack<T> {
    const stack = new UndoRedoStack<T>(fallback, limit);
    if (!isRecord(data)) return stack;
    stack.presentValue = 'present' in data ? (data.present as T) : fallback;
    stack.past = Array.isArray(data.past) ? (data.past.slice(-stack.limit) as T[]) : [];
    stack.future = Array.isArray(data.future) ? (data.future.slice(0, stack.limit) as T[]) : [];
    return stack;
  }
}
