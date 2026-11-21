/** Monotonic limb/halo falloff profiles for atmosphere layers. */

import { clamp, finiteOr } from '../engine/numeric';
import { smoothstep } from './color';

export type AtmosphereProfile = 'rim' | 'exponential' | 'linear' | 'smooth';

export interface AtmosphereProfileParams {
  scaleHeight: number;
  exponent: number;
}

export const ATMOSPHERE_PROFILES: Record<AtmosphereProfile, AtmosphereProfileParams> = {
  rim: { scaleHeight: 0.32, exponent: 3.2 },
  exponential: { scaleHeight: 0.28, exponent: 1 },
  linear: { scaleHeight: 1, exponent: 1 },
  smooth: { scaleHeight: 1, exponent: 1 },
};

/**
 * Normalised atmosphere strength at an altitude in 0..1 (0 at the surface).
 * Every profile is non-increasing over the unit interval.
 */
export function atmosphereFalloff(altitude: number, profile: AtmosphereProfile = 'rim'): number {
  const t = clamp(finiteOr(altitude, 1), 0, 1);
  const params = ATMOSPHERE_PROFILES[profile] ?? ATMOSPHERE_PROFILES.rim;
  switch (profile) {
    case 'exponential':
      return clamp(Math.exp(-t / Math.max(params.scaleHeight, 1e-6)), 0, 1);
    case 'linear':
      return 1 - t;
    case 'smooth':
      return 1 - smoothstep(0, 1, t);
    case 'rim':
    default:
      return Math.pow(1 - t, Math.max(params.exponent, 1e-6));
  }
}

/** Falloff multiplied by a finite intensity and clamped to 0..1. */
export function atmosphereOpacity(
  altitude: number,
  intensity = 1,
  profile: AtmosphereProfile = 'rim',
): number {
  return clamp(atmosphereFalloff(altitude, profile) * clamp(finiteOr(intensity, 0), 0, 4), 0, 1);
}

/** All profile names, useful for UI selectors and exhaustive tests. */
export function atmosphereProfileNames(): AtmosphereProfile[] {
  return Object.keys(ATMOSPHERE_PROFILES) as AtmosphereProfile[];
}
