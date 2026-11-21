/** Common physical constants and numerical helpers used throughout the engine. */

/** Newtonian gravitational constant, m³ kg⁻¹ s⁻² (CODATA 2018). */
export const G = 6.6743e-11;
/** Astronomical unit, metres. */
export const AU = 1.495978707e11;
/** Solar mass, kilograms. */
export const SOLAR_MASS = 1.98847e30;
/** Earth mass, kilograms. */
export const EARTH_MASS = 5.9722e24;
/** Earth radius, metres. */
export const EARTH_RADIUS = 6.371e6;
/** Julian day, seconds. */
export const DAY = 86400;
/** Julian year, seconds. */
export const YEAR = 365.25 * DAY;
/** Speed of light in vacuum, m/s. */
export const C = 299792458;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function finiteOr(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Clamps a value away from zero while retaining its sign. */
export function safeMagnitude(value: number, minimum: number): number {
  const magnitude = Math.max(Math.abs(value), minimum);
  return value < 0 ? -magnitude : magnitude;
}

export function roundTo(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Deterministic 32-bit hash. Used by the procedural generator so a seed always
 * reproduces the same universe.
 */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 — small, fast, seedable pseudo-random generator. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatScientific(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e-2 && Math.abs(value) < 1e5) {
    return roundTo(value, digits).toLocaleString('en-US');
  }
  return value.toExponential(digits).replace('e+', 'e');
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const abs = Math.abs(seconds);
  if (abs < 60) return `${seconds.toFixed(1)} s`;
  if (abs < 86400) return `${(seconds / 3600).toFixed(2)} h`;
  if (abs < 365.25 * 86400) return `${(seconds / 86400).toFixed(2)} d`;
  return `${(seconds / (365.25 * 86400)).toFixed(2)} yr`;
}
