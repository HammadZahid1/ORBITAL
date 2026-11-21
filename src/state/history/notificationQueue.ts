import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

const TONES: readonly NotificationTone[] = ['info', 'success', 'warning', 'error'];

export interface QueuedNotification {
  id: string;
  message: string;
  tone: NotificationTone;
  createdAt: number;
}

export interface NotificationOptions {
  id?: string;
  createdAt?: number;
}

function toTone(value: unknown): NotificationTone {
  return TONES.find((tone) => tone === value) ?? 'info';
}

/** Bounded FIFO of transient messages; timing and rendering stay outside. */
export class NotificationQueue {
  readonly capacity: number;
  private items: QueuedNotification[] = [];
  private sequence = 0;

  constructor(capacity = 4) {
    this.capacity = clampCapacity(capacity, 4);
  }

  get size(): number {
    return this.items.length;
  }

  enqueue(message: string, tone: NotificationTone = 'info', options: NotificationOptions = {}): QueuedNotification {
    this.sequence += 1;
    const notification: QueuedNotification = {
      id: options.id ?? `note-${this.sequence}`,
      message,
      tone: toTone(tone),
      createdAt: options.createdAt ?? Date.now(),
    };
    this.items.push(notification);
    if (this.items.length > this.capacity) this.items.shift();
    return { ...notification };
  }

  peek(): QueuedNotification | null {
    const first = this.items[0];
    return first ? { ...first } : null;
  }

  dequeue(): QueuedNotification | null {
    const first = this.items.shift();
    return first ? { ...first } : null;
  }

  dismiss(id: string): boolean {
    const next = this.items.filter((item) => item.id !== id);
    if (next.length === this.items.length) return false;
    this.items = next;
    return true;
  }

  pending(): QueuedNotification[] {
    return this.items.map((item) => ({ ...item }));
  }

  clear(): void {
    this.items = [];
  }

  toJSON(): QueuedNotification[] {
    return this.pending();
  }

  static fromJSON(data: unknown, capacity?: number): NotificationQueue {
    const queue = new NotificationQueue(capacity);
    if (!Array.isArray(data)) return queue;
    for (const item of data) {
      if (!isRecord(item) || typeof item.message !== 'string') continue;
      queue.sequence += 1;
      queue.items.push({
        id: readString(item.id, `note-${queue.sequence}`),
        message: readString(item.message),
        tone: toTone(item.tone),
        createdAt: readNumber(item.createdAt),
      });
    }
    queue.items = queue.items.slice(-queue.capacity);
    return queue;
  }
}
