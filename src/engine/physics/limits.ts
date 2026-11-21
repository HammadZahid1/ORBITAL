import { C, G } from '../numeric';

/** Approximate limits used by the extreme-physics and mission panels. */
export function surfaceGravity(mass: number, radius: number): number {
  return radius > 0 && mass > 0 ? (G * mass) / (radius * radius) : 0;
}

export function escapeSpeed(mass: number, radius: number): number {
  return radius > 0 && mass > 0 ? Math.sqrt((2 * G * mass) / radius) : 0;
}

/** Schwarzschild radius from the Newtonian escape speed set equal to c. */
export function schwarzschildRadius(mass: number): number {
  return mass > 0 ? (2 * G * mass) / (C * C) : 0;
}

/** Hill-sphere radius for a small body orbiting a much more massive primary. */
export function hillRadius(bodyMass: number, primaryMass: number, semiMajorAxis: number): number {
  return primaryMass > 0 && semiMajorAxis > 0
    ? semiMajorAxis * Math.cbrt(bodyMass / (3 * primaryMass))
    : 0;
}

/** Fluid Roche limit approximation for a satellite with the given densities. */
export function rocheLimit(
  primaryRadius: number,
  primaryDensity: number,
  satelliteDensity: number,
): number {
  if (primaryRadius <= 0 || primaryDensity <= 0 || satelliteDensity <= 0) return 0;
  return 2.44 * primaryRadius * Math.cbrt(primaryDensity / satelliteDensity);
}

/** Fraction of c represented by a speed, clamped to the physically meaningful range. */
export function relativisticBeta(speed: number): number {
  return Math.min(1, Math.max(0, Math.abs(speed) / C));
}
