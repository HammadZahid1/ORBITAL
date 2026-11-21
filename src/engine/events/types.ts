/** Framework-agnostic primitives for simulation events. */
import type { CollisionMode } from '../../types/celestial';

/** Payload carried by a collision event, mirroring the engine collision record. */
export interface CollisionEventPayload {
  id: string;
  indexA: number;
  indexB: number;
  idA: string;
  idB: string;
  time: number;
  distance: number;
  relativeSpeed: number;
  penetration: number;
  response: CollisionMode;
  absorbedIndex: number | null;
}

/** Payload carried when two predicted paths reach their closest sampled separation. */
export interface CloseApproachEventPayload {
  id: string;
  indexA: number;
  indexB: number;
  idA: string;
  idB: string;
  distance: number;
  time: number;
  sampleIndex: number;
  threshold: number | null;
}

/** Payload carried when a body satisfies a two-body escape criterion. */
export interface EscapeEventPayload {
  id: string;
  index: number;
  primaryIndex: number;
  bodyId: string;
  primaryId: string;
  time: number;
  distance: number;
  speed: number;
  radialSpeed: number;
  escapeSpeed: number;
  specificEnergy: number;
  margin: number;
}

/** Payload carried when a body transitions from unbound to bound around a primary. */
export interface CaptureEventPayload {
  id: string;
  index: number;
  primaryIndex: number;
  bodyId: string;
  primaryId: string;
  time: number;
  distance: number;
  speed: number;
  radialSpeed: number;
  specificEnergy: number;
  margin: number;
}

/** Axis-aligned coordinate plane crossed by a body between two samples. */
export type CrossingAxis = 'x' | 'y' | 'z';

export interface CrossingEventPayload {
  id: string;
  index: number;
  bodyId: string;
  axis: CrossingAxis;
  plane: number;
  referenceIndex: number | null;
  referenceId: string | null;
  from: number;
  to: number;
  time: number;
  direction: -1 | 1;
  fraction: number;
}

/** Lightweight solver progress event, useful for timeline and throttle examples. */
export interface TickEventPayload {
  dt: number;
  steps: number;
  time: number;
}

/**
 * Registry of simulation event names and payloads. Consumers may augment this
 * interface through declaration merging to add strongly typed custom events.
 */
export interface SimulationEventMap {
  collision: CollisionEventPayload;
  closeApproach: CloseApproachEventPayload;
  escape: EscapeEventPayload;
  capture: CaptureEventPayload;
  crossing: CrossingEventPayload;
  tick: TickEventPayload;
}

export type SimulationEventName = keyof SimulationEventMap;

/** Names with built-in payload definitions (custom names can still be emitted). */
export const SIMULATION_EVENT_NAMES = [
  'collision',
  'closeApproach',
  'escape',
  'capture',
  'crossing',
  'tick',
] as const satisfies readonly SimulationEventName[];

export interface SimulationEvent<K extends SimulationEventName = SimulationEventName> {
  readonly type: K;
  readonly payload: SimulationEventMap[K];
  readonly time: number;
  readonly sequence: number;
  readonly priority: number;
  readonly id: string;
}

export type EventHandler<K extends SimulationEventName = SimulationEventName> = (event: SimulationEvent<K>) => void;
export type AnyEventHandler = (event: SimulationEvent) => void;

/** Returns a finite number or `fallback` for non-numeric, NaN and infinite input. */
export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Returns a finite number or null, used where absence is meaningful. */
export function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Normalises an integer to `[1, max]`, falling back when the input is invalid. */
export function positiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const source = finiteNumber(value, fallback);
  return Math.min(max, Math.max(1, Math.floor(source)));
}

/** Normalises an integer to `[0, max]`, falling back when the input is invalid. */
export function nonNegativeInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const source = finiteNumber(value, fallback);
  return Math.min(max, Math.max(0, Math.floor(source)));
}

/** Minimal JSON-record guard that does not depend on state or UI modules. */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Loose runtime shape check used by the bus and stores. It deliberately does
 * not require a built-in event name so declaration-merged events also work.
 */
export function isEventLike(value: unknown): value is SimulationEvent {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.type === 'string' &&
    isPlainRecord(value.payload) &&
    finiteOrNull(value.time) !== null &&
    finiteOrNull(value.sequence) !== null &&
    finiteOrNull(value.priority) !== null &&
    typeof value.id === 'string'
  );
}

/** True for finite numeric triples used by adapters and detection helpers. */
export function isFiniteVector(value: unknown): value is { x: number; y: number; z: number } {
  if (!isPlainRecord(value)) return false;
  return finiteOrNull(value.x) !== null && finiteOrNull(value.y) !== null && finiteOrNull(value.z) !== null;
}
