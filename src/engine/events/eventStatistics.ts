/** Aggregates emitted events into bounded, serialisable counters. */
import { isEventLike, type SimulationEvent } from './types';

export interface EventStatisticsSnapshot {
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  firstTime: number | null;
  lastTime: number | null;
}

export class EventStatistics {
  private totalCount = 0;
  private readonly typeCounts = new Map<string, number>();
  private readonly priorityCounts = new Map<number, number>();
  private first = Number.POSITIVE_INFINITY;
  private last = Number.NEGATIVE_INFINITY;

  get total(): number {
    return this.totalCount;
  }

  record(event: SimulationEvent): boolean {
    if (!isEventLike(event)) return false;
    this.totalCount += 1;
    this.typeCounts.set(event.type, (this.typeCounts.get(event.type) ?? 0) + 1);
    this.priorityCounts.set(event.priority, (this.priorityCounts.get(event.priority) ?? 0) + 1);
    this.first = Math.min(this.first, event.time);
    this.last = Math.max(this.last, event.time);
    return true;
  }

  recordAll(events: readonly SimulationEvent[]): number {
    let recorded = 0;
    for (const event of events) if (this.record(event)) recorded += 1;
    return recorded;
  }

  count(type: string): number {
    return this.typeCounts.get(type) ?? 0;
  }

  /** Finite events per simulation second over an explicit window, or null. */
  rate(startTime: number, endTime: number): number | null {
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return null;
    return this.totalCount / (endTime - startTime);
  }

  duration(): number | null {
    if (this.totalCount === 0) return null;
    return this.last - this.first;
  }

  snapshot(): EventStatisticsSnapshot {
    const byType: Record<string, number> = {};
    for (const [type, count] of this.typeCounts) byType[type] = count;
    const byPriority: Record<string, number> = {};
    for (const [priority, count] of this.priorityCounts) byPriority[String(priority)] = count;
    return {
      total: this.totalCount,
      byType,
      byPriority,
      firstTime: this.totalCount === 0 ? null : this.first,
      lastTime: this.totalCount === 0 ? null : this.last,
    };
  }

  reset(): void {
    this.totalCount = 0;
    this.typeCounts.clear();
    this.priorityCounts.clear();
    this.first = Number.POSITIVE_INFINITY;
    this.last = Number.NEGATIVE_INFINITY;
  }
}
