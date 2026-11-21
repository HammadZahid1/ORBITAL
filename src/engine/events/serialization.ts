/** Validation and JSON round-tripping for simulation events. */
import { SIMULATION_EVENT_NAMES } from './types';
import {
  finiteOrNull,
  isEventLike,
  isPlainRecord,
  type SimulationEvent,
  type SimulationEventName,
} from './types';

export interface SerializedEvent {
  type: string;
  payload: Record<string, unknown>;
  time: number;
  sequence: number;
  priority: number;
  id: string;
}

const MAX_DEPTH = 12;

const NUMERIC_FIELDS: Partial<Record<SimulationEventName, readonly string[]>> = {
  collision: ['indexA', 'indexB', 'time', 'distance', 'relativeSpeed', 'penetration'],
  closeApproach: ['indexA', 'indexB', 'time', 'distance', 'sampleIndex'],
  escape: ['index', 'primaryIndex', 'time', 'distance', 'speed', 'radialSpeed', 'escapeSpeed', 'specificEnergy', 'margin'],
  capture: ['index', 'primaryIndex', 'time', 'distance', 'speed', 'radialSpeed', 'specificEnergy', 'margin'],
  crossing: ['index', 'plane', 'from', 'to', 'time', 'fraction'],
  tick: ['dt', 'steps', 'time'],
};

function isFiniteJson(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' || typeof value === 'boolean' || value === null) return true;
  if (Array.isArray(value)) return value.every((item) => isFiniteJson(item, depth + 1));
  if (isPlainRecord(value)) return Object.values(value).every((item) => isFiniteJson(item, depth + 1));
  return false;
}

function cloneFiniteJson(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return value.map((item) => cloneFiniteJson(item, depth + 1));
  if (isPlainRecord(value)) {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = cloneFiniteJson(item, depth + 1);
    return copy;
  }
  return value;
}

function isNullableFinite(value: unknown): boolean {
  return value === null || finiteOrNull(value) !== null;
}

function hasRequiredFields(type: SimulationEventName, payload: Record<string, unknown>): boolean {
  const fields = NUMERIC_FIELDS[type];
  if (fields && !fields.every((field) => finiteOrNull(payload[field]) !== null)) return false;
  for (const field of ['absorbedIndex', 'threshold']) {
    if (field in payload && !isNullableFinite(payload[field])) return false;
  }
  return true;
}

/** Strict guard: known payloads must contain finite required fields. */
export function isSimulationEvent(value: unknown): value is SimulationEvent {
  if (!isEventLike(value)) return false;
  if (!Number.isInteger(value.sequence) || value.sequence < 0) return false;
  const payload = value.payload as unknown as Record<string, unknown>;
  if (!isFiniteJson(payload)) return false;
  const type = value.type as SimulationEventName;
  if ((SIMULATION_EVENT_NAMES as readonly string[]).includes(type) && !hasRequiredFields(type, payload)) return false;
  return true;
}

/** Returns a detached JSON-shaped copy, or null when the event is invalid. */
export function serializeEvent(event: SimulationEvent): SerializedEvent | null {
  if (!isSimulationEvent(event)) return null;
  return {
    type: event.type,
    payload: cloneFiniteJson(event.payload) as Record<string, unknown>,
    time: event.time,
    sequence: event.sequence,
    priority: event.priority,
    id: event.id,
  };
}

/** Restores an event from untrusted JSON-shaped data; invalid input is skipped. */
export function deserializeEvent(value: unknown): SimulationEvent | null {
  if (!isPlainRecord(value)) return null;
  if (typeof value.type !== 'string' || !isPlainRecord(value.payload) || typeof value.id !== 'string') return null;
  const time = finiteOrNull(value.time);
  const sequence = finiteOrNull(value.sequence);
  const priority = finiteOrNull(value.priority);
  if (time === null || sequence === null || priority === null) return null;

  const candidate = {
    type: value.type,
    payload: cloneFiniteJson(value.payload) as Record<string, unknown>,
    time,
    sequence,
    priority,
    id: value.id,
  };
  return isSimulationEvent(candidate) ? (candidate as unknown as SimulationEvent) : null;
}

export function serializeEvents(events: readonly SimulationEvent[]): SerializedEvent[] {
  const result: SerializedEvent[] = [];
  for (const event of events) {
    const serialized = serializeEvent(event);
    if (serialized) result.push(serialized);
  }
  return result;
}

export function deserializeEvents(value: unknown): SimulationEvent[] {
  if (!Array.isArray(value)) return [];
  const result: SimulationEvent[] = [];
  for (const item of value) {
    const event = deserializeEvent(item);
    if (event) result.push(event);
  }
  return result;
}
