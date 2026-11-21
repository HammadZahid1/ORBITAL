/** Per-body Hill radius estimates derived from instantaneous parent separation. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { findBodyById } from './bodyIndex';
import {
  buildWorldIndex,
  distanceBetween,
  finiteNumber,
  worldIndexMap,
  worldPosition,
  worldPositiveMass,
} from './internal';

/**
 * Hill radius of a body around its parent, in metres:
 *
 *   r_H ≈ a · (m / (3 (M + m)))^(1/3)
 *
 * `a` is the current parent separation used as a circular-orbit proxy. Roots,
 * unknown parents, non-finite state and non-positive masses yield null.
 */
export function hillRadius(world: PhysicsWorld, bodies: readonly CelestialBody[], id: string): number | null {
  const body = findBodyById(bodies, id);
  if (!body || typeof body.parentId !== 'string') return null;
  const parent = findBodyById(bodies, body.parentId);
  if (!parent || parent.id === body.id) return null;

  const worldById = worldIndexMap(world);
  const bodyIndex = worldById.get(id);
  const parentIndex = worldById.get(parent.id);
  if (bodyIndex === undefined || parentIndex === undefined) return null;

  const bodyMass = worldPositiveMass(world, bodyIndex);
  const parentMass = worldPositiveMass(world, parentIndex);
  const bodyPosition = worldPosition(world, bodyIndex);
  const parentPosition = worldPosition(world, parentIndex);
  if (bodyMass === null || parentMass === null || !bodyPosition || !parentPosition) return null;

  const separation = distanceBetween(bodyPosition, parentPosition);
  const total = finiteNumber(bodyMass + parentMass);
  if (separation <= 0 || total === null || total <= 0) return null;
  const ratio = finiteNumber(bodyMass / (3 * total));
  if (ratio === null || ratio < 0) return null;
  const radius = finiteNumber(separation * Math.cbrt(ratio));
  return radius !== null && radius >= 0 ? radius : null;
}

export const hillRadiusForBody = hillRadius;

/** Hill radius for every unique body ID that has a computable parent relationship. */
export function hillRadii(world: PhysicsWorld, bodies: readonly CelestialBody[]): Map<string, number> {
  const radii = new Map<string, number>();
  const present = buildWorldIndex(world);
  for (const body of bodies) {
    if (!body || radii.has(body.id) || !present.has(body.id)) continue;
    const radius = hillRadius(world, bodies, body.id);
    if (radius !== null) radii.set(body.id, radius);
  }
  return radii;
}
