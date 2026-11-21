import type { CameraConfiguration } from '../../scenarios/types';
import { clampCapacity, isFiniteNumber, isRecord, readNumber, readString } from './serialization';

export interface CameraBookmark {
  name: string;
  view: CameraConfiguration;
  createdAt: number;
}

function isVec3Tuple(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);
}

function isCameraConfiguration(value: unknown): value is CameraConfiguration {
  return (
    isRecord(value) &&
    isVec3Tuple(value.position) &&
    isVec3Tuple(value.target) &&
    isFiniteNumber(value.suggestedDistance)
  );
}

function cloneView(view: CameraConfiguration): CameraConfiguration {
  return {
    position: [...view.position] as [number, number, number],
    target: [...view.target] as [number, number, number],
    suggestedDistance: view.suggestedDistance,
  };
}

/** Named camera poses with insertion-order capacity eviction. */
export class CameraBookmarkStore {
  readonly capacity: number;
  private bookmarks = new Map<string, CameraBookmark>();

  constructor(capacity = 12) {
    this.capacity = clampCapacity(capacity, 12);
  }

  get size(): number {
    return this.bookmarks.size;
  }

  save(name: string, view: CameraConfiguration, at = Date.now()): CameraBookmark {
    const bookmark: CameraBookmark = { name, view: cloneView(view), createdAt: at };
    if (!this.bookmarks.has(name) && this.bookmarks.size >= this.capacity) {
      const oldest = this.bookmarks.keys().next().value;
      if (oldest !== undefined) this.bookmarks.delete(oldest);
    }
    this.bookmarks.set(name, bookmark);
    return { ...bookmark, view: cloneView(bookmark.view) };
  }

  get(name: string): CameraBookmark | null {
    const bookmark = this.bookmarks.get(name);
    return bookmark ? { ...bookmark, view: cloneView(bookmark.view) } : null;
  }

  has(name: string): boolean {
    return this.bookmarks.has(name);
  }

  remove(name: string): boolean {
    return this.bookmarks.delete(name);
  }

  names(): string[] {
    return [...this.bookmarks.keys()];
  }

  list(): CameraBookmark[] {
    return [...this.bookmarks.values()].map((bookmark) => ({ ...bookmark, view: cloneView(bookmark.view) }));
  }

  clear(): void {
    this.bookmarks.clear();
  }

  toJSON(): CameraBookmark[] {
    return this.list();
  }

  static fromJSON(data: unknown, capacity?: number): CameraBookmarkStore {
    const store = new CameraBookmarkStore(capacity);
    if (!Array.isArray(data)) return store;
    for (const item of data) {
      if (!isRecord(item) || typeof item.name !== 'string' || !isCameraConfiguration(item.view)) continue;
      store.bookmarks.set(readString(item.name), {
        name: readString(item.name),
        view: cloneView(item.view),
        createdAt: readNumber(item.createdAt),
      });
    }
    while (store.bookmarks.size > store.capacity) {
      const oldest = store.bookmarks.keys().next().value;
      if (oldest === undefined) break;
      store.bookmarks.delete(oldest);
    }
    return store;
  }
}
