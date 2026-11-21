import type { Universe, CelestialBody } from '../types/celestial';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../state/defaults';

export const SCHEMA_VERSION = 1;
export const STORAGE_PREFIX = 'orbital:';

export interface Envelope<T> {
  version: number;
  kind: string;
  savedAt: number;
  data: T;
}

export function wrap<T>(kind: string, data: T): Envelope<T> {
  return { version: SCHEMA_VERSION, kind, savedAt: Date.now(), data };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVec3(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);
}

export function validateBodyShape(value: unknown): value is CelestialBody {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.type !== 'string') return false;
  if (!isRecord(value.physical) || !isRecord(value.visual)) return false;
  const physical = value.physical;
  if (!isFiniteNumber(physical.mass) || physical.mass <= 0) return false;
  if (!isFiniteNumber(physical.radius) || physical.radius <= 0) return false;
  if (!isVec3(physical.position) || !isVec3(physical.velocity) || !isVec3(physical.acceleration)) return false;
  if (!isFiniteNumber(physical.rotation) || !isFiniteNumber(physical.rotationSpeed)) return false;
  const visual = value.visual;
  if (typeof visual.color !== 'string' || typeof visual.material !== 'string') return false;
  if (!isFiniteNumber(visual.visualScale) || visual.visualScale <= 0) return false;
  if (!isRecord(visual.trail) || !isFiniteNumber(visual.trail.length)) return false;
  return true;
}

export function validateUniverseShape(value: unknown): value is Universe {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false;
  if (!Array.isArray(value.bodies) || !value.bodies.every(validateBodyShape)) return false;
  const ids = new Set(value.bodies.map((body: CelestialBody) => body.id));
  if (ids.size !== value.bodies.length) return false;
  if (!isRecord(value.settings)) return false;
  const settings = value.settings;
  return (
    isFiniteNumber(settings.G) &&
    isFiniteNumber(settings.softening) &&
    isFiniteNumber(settings.timestep) &&
    typeof settings.integrator === 'string'
  );
}

export function validateSettingsShape(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false;
  return (
    typeof value.theme === 'string' &&
    typeof value.reduceMotion === 'boolean' &&
    isFiniteNumber(value.timestep) &&
    isFiniteNumber(value.timeScale) &&
    isRecord(value.performance)
  );
}

export function unwrap<T>(
  raw: string,
  kind: string,
  validator: (value: unknown) => value is T,
): T | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== SCHEMA_VERSION || parsed.kind !== kind) return null;
    if (!validator(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Merges stored settings with defaults so new options are always present. */
export function normaliseSettings(value: unknown): AppSettings {
  if (!validateSettingsShape(value)) return structuredClone(DEFAULT_SETTINGS);
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...value,
    performance: { ...DEFAULT_SETTINGS.performance, ...value.performance },
  };
}
