/** Stable priority ordering for simulation events and listeners. */
import type { SimulationEvent } from './types';
import { finiteNumber } from './types';

export const EVENT_PRIORITY = Object.freeze({
  lowest: -100,
  low: -10,
  normal: 0,
  high: 10,
  critical: 100,
});

export type PriorityLevel = keyof typeof EVENT_PRIORITY;

/** Coerces a priority to a finite number; non-finite values use the fallback. */
export function resolvePriority(value: unknown, fallback: number = EVENT_PRIORITY.normal): number {
  return finiteNumber(value, finiteNumber(fallback, EVENT_PRIORITY.normal));
}

/**
 * Higher priorities run first. Equal priorities keep insertion order via the
 * monotonically increasing sequence number, so ordering is always deterministic.
 */
export function compareEventPriority(
  a: Pick<SimulationEvent, 'priority' | 'sequence'>,
  b: Pick<SimulationEvent, 'priority' | 'sequence'>,
): number {
  const byPriority = b.priority - a.priority;
  if (byPriority !== 0) return byPriority;
  return a.sequence - b.sequence;
}

/** Returns a new, highest-priority-first array without mutating the input. */
export function sortByPriority<T extends Pick<SimulationEvent, 'priority' | 'sequence'>>(events: readonly T[]): T[] {
  return [...events].sort(compareEventPriority);
}
