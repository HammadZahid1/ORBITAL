import { STORAGE_PREFIX } from './schema';

/** localStorage wrapper that never throws (private browsing, quota, disabled storage). */
export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Storage may be unavailable; nothing to clean up.
  }
}

export function safeKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key.slice(STORAGE_PREFIX.length));
    }
    return keys;
  } catch {
    return [];
  }
}
