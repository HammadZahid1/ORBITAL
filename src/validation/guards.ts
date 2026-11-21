import type { CelestialBody, Universe } from '../types/celestial';
import type { Vec3 } from '../types/vector';

/** Runtime guards used before reading untrusted parsed data. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Checks vector shape only; non-finite components are reported by finiteState. */
export function isVec3Like(value: unknown): value is Vec3 {
  const record = isRecord(value) ? value : null;
  return (
    record !== null &&
    typeof record.x === 'number' &&
    typeof record.y === 'number' &&
    typeof record.z === 'number'
  );
}

export function isBodyLike(value: unknown): value is CelestialBody {
  const record = isRecord(value) ? value : null;
  if (record === null) return false;
  const physical = isRecord(record.physical) ? record.physical : null;
  const visual = isRecord(record.visual) ? record.visual : null;
  if (physical === null || visual === null) return false;
  return (
    isVec3Like(physical.position) &&
    isVec3Like(physical.velocity) &&
    isVec3Like(physical.acceleration) &&
    isRecord(visual.trail)
  );
}

export function isUniverseLike(value: unknown): value is Universe {
  const record = isRecord(value) ? value : null;
  if (record === null) return false;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    Array.isArray(record.bodies) &&
    record.bodies.every(isBodyLike) &&
    isRecord(record.settings)
  );
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/** Returns a finite number or a fallback, for diagnostics that must not throw. */
export function finiteOr(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

export function safeString(value: unknown): string {
  return typeof value === 'string' ? value : String(value);
}
