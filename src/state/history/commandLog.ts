import { clampCapacity, isRecord, readNumber, readString } from './serialization';

export type CommandStatus = 'applied' | 'undone' | 'redone' | 'failed';

const STATUSES: readonly CommandStatus[] = ['applied', 'undone', 'redone', 'failed'];

export interface CommandEntry {
  id: string;
  label: string;
  status: CommandStatus;
  issuedAt: number;
  durationMs: number | null;
}

export interface CommandRecordOptions {
  id?: string;
  issuedAt?: number;
  durationMs?: number;
}

function toStatus(value: unknown): CommandStatus {
  return STATUSES.find((status) => status === value) ?? 'applied';
}

/** Bounded audit trail of user-issued commands and their outcome. */
export class CommandLog {
  readonly capacity: number;
  private entries: CommandEntry[] = [];
  private sequence = 0;

  constructor(capacity = 100) {
    this.capacity = clampCapacity(capacity, 100);
  }

  get size(): number {
    return this.entries.length;
  }

  record(label: string, status: CommandStatus = 'applied', options: CommandRecordOptions = {}): CommandEntry {
    this.sequence += 1;
    const entry: CommandEntry = {
      id: options.id ?? `cmd-${this.sequence}`,
      label,
      status: toStatus(status),
      issuedAt: options.issuedAt ?? Date.now(),
      durationMs: options.durationMs ?? null,
    };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
    this.syncSequence();
    return entry;
  }

  update(id: string, patch: Partial<Pick<CommandEntry, 'status' | 'durationMs'>>): boolean {
    const entry = this.entries.find((item) => item.id === id);
    if (!entry) return false;
    if (patch.status !== undefined) entry.status = toStatus(patch.status);
    if (patch.durationMs !== undefined) entry.durationMs = patch.durationMs;
    return true;
  }

  /** Most recent entries first. */
  recent(count = this.entries.length): CommandEntry[] {
    if (count <= 0) return [];
    return this.entries.slice(-Math.floor(count)).reverse().map((entry) => ({ ...entry }));
  }

  filter(predicate: (entry: CommandEntry) => boolean): CommandEntry[] {
    return this.entries.filter(predicate).map((entry) => ({ ...entry }));
  }

  byStatus(status: CommandStatus): CommandEntry[] {
    return this.filter((entry) => entry.status === status);
  }

  clear(): void {
    this.entries = [];
  }

  toJSON(): CommandEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  static fromJSON(data: unknown, capacity?: number): CommandLog {
    const log = new CommandLog(capacity);
    if (!Array.isArray(data)) return log;
    for (const item of data) {
      if (!isRecord(item) || typeof item.label !== 'string') continue;
      log.entries.push({
        id: readString(item.id, `cmd-${log.sequence + 1}`),
        label: readString(item.label),
        status: toStatus(item.status),
        issuedAt: readNumber(item.issuedAt),
        durationMs: typeof item.durationMs === 'number' && Number.isFinite(item.durationMs) ? item.durationMs : null,
      });
    }
    log.entries = log.entries.slice(-log.capacity);
    log.syncSequence();
    return log;
  }

  private syncSequence(): void {
    let highest = 0;
    for (const entry of this.entries) {
      const match = /^cmd-(\d+)$/.exec(entry.id);
      if (match) highest = Math.max(highest, Number(match[1]));
    }
    this.sequence = Math.max(this.sequence, highest);
  }
}
