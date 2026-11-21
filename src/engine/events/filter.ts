/** Composable predicates for selecting simulation events. */
import {
  finiteOrNull,
  isPlainRecord,
  type SimulationEvent,
  type SimulationEventName,
} from './types';

export type EventPredicate<K extends SimulationEventName = SimulationEventName> = (event: SimulationEvent<K>) => boolean;

export interface EventFilterSpec {
  types?: readonly SimulationEventName[];
  minPriority?: number;
  maxPriority?: number;
  startTime?: number;
  endTime?: number;
  /** Matches any body identifier carried in a payload (bodyId, idA, idB, ...). */
  bodyIds?: readonly string[];
  predicate?: EventPredicate;
}

export type EventFilter<K extends SimulationEventName = SimulationEventName> = EventFilterSpec | EventPredicate<K>;

/** Collects body identifiers from known payload fields without assuming a type. */
export function eventBodyIds(event: SimulationEvent): string[] {
  if (!isPlainRecord(event.payload)) return [];
  const keys = ['bodyId', 'primaryId', 'referenceId', 'idA', 'idB'];
  const ids = new Set<string>();
  for (const key of keys) {
    const value = event.payload[key];
    if (typeof value === 'string' && value.length > 0) ids.add(value);
  }
  return [...ids];
}

/** Non-finite bounds are ignored rather than accidentally filtering everything. */
export function matchesFilter(filter: EventFilter | undefined, event: SimulationEvent): boolean {
  if (!filter) return true;
  if (typeof filter === 'function') return filter(event) === true;

  if (filter.types && filter.types.length > 0 && !filter.types.includes(event.type)) return false;

  const minPriority = finiteOrNull(filter.minPriority);
  if (minPriority !== null && event.priority < minPriority) return false;
  const maxPriority = finiteOrNull(filter.maxPriority);
  if (maxPriority !== null && event.priority > maxPriority) return false;

  const startTime = finiteOrNull(filter.startTime);
  if (startTime !== null && event.time < startTime) return false;
  const endTime = finiteOrNull(filter.endTime);
  if (endTime !== null && event.time > endTime) return false;

  if (filter.bodyIds && filter.bodyIds.length > 0) {
    const ids = eventBodyIds(event);
    if (!filter.bodyIds.some((id) => ids.includes(id))) return false;
  }

  return filter.predicate ? filter.predicate(event) === true : true;
}

export function andFilter(...filters: readonly EventFilter[]): EventPredicate {
  return (event) => filters.every((filter) => matchesFilter(filter, event));
}

export function orFilter(...filters: readonly EventFilter[]): EventPredicate {
  return (event) => filters.length > 0 && filters.some((filter) => matchesFilter(filter, event));
}

export function notFilter(filter: EventFilter): EventPredicate {
  return (event) => !matchesFilter(filter, event);
}

export function typeFilter(types: readonly SimulationEventName[]): EventPredicate {
  return (event) => types.includes(event.type);
}

export function bodyFilter(ids: readonly string[]): EventPredicate {
  return (event) => {
    const carried = eventBodyIds(event);
    return ids.some((id) => carried.includes(id));
  };
}

export function priorityFilter(minPriority?: number, maxPriority?: number): EventPredicate {
  return (event) => {
    const min = finiteOrNull(minPriority);
    const max = finiteOrNull(maxPriority);
    return (min === null || event.priority >= min) && (max === null || event.priority <= max);
  };
}
