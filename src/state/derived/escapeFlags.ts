/** Two-body escape flags relative to each body's hierarchical parent. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { findBodyById } from './bodyIndex';
import {
  addFinite,
  buildWorldIndex,
  clampFinite,
  distanceBetween,
  finiteNumber,
  subtractVec3,
  worldIndexMap,
  worldPosition,
  worldPositiveMass,
  worldVelocity,
} from './internal';

export interface EscapeFlag {
  id: string;
  parentId: string | null;
  /** False for roots, unresolved parents and any non-finite/invalid state. */
  escaped: boolean;
  /** Specific orbital energy in J/kg; null when it cannot be computed. */
  specificEnergy: number | null;
  /** Local escape speed in m/s; null when it cannot be computed. */
  escapeSpeed: number | null;
  /** Radial speed away from the parent in m/s; null when unavailable. */
  radialSpeed: number | null;
}

export interface EscapeFlagOptions {
  /** Energy threshold for the unbound test (default 0, the parabolic boundary). */
  energyMargin?: number;
  /** Also require outward radial motion (default false). */
  outwardOnly?: boolean;
}

/** Escape assessment for one body. Null only when the body ID does not exist. */
export function escapeFlagForBody(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  id: string,
  options: EscapeFlagOptions = {},
): EscapeFlag | null {
  const body = findBodyById(bodies, id);
  if (!body) return null;
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  const flag: EscapeFlag = {
    id,
    parentId,
    escaped: false,
    specificEnergy: null,
    escapeSpeed: null,
    radialSpeed: null,
  };
  if (parentId === null || parentId === id || !findBodyById(bodies, parentId)) return flag;

  const worldById = worldIndexMap(world);
  const bodyIndex = worldById.get(id);
  const parentIndex = worldById.get(parentId);
  if (bodyIndex === undefined || parentIndex === undefined) return flag;

  const bodyMass = worldPositiveMass(world, bodyIndex);
  const parentMass = worldPositiveMass(world, parentIndex);
  const bodyPosition = worldPosition(world, bodyIndex);
  const parentPosition = worldPosition(world, parentIndex);
  const bodyVelocity = worldVelocity(world, bodyIndex);
  const parentVelocity = worldVelocity(world, parentIndex);
  const gravity = finiteNumber(world.G);
  if (
    bodyMass === null ||
    parentMass === null ||
    !bodyPosition ||
    !parentPosition ||
    !bodyVelocity ||
    !parentVelocity ||
    gravity === null ||
    gravity <= 0
  ) {
    return flag;
  }

  const separation = distanceBetween(bodyPosition, parentPosition);
  const relative = subtractVec3(bodyVelocity, parentVelocity);
  const displacement = subtractVec3(bodyPosition, parentPosition);
  const speed = Math.hypot(relative.x, relative.y, relative.z);
  const mu = gravity * addFinite(bodyMass, parentMass);
  if (separation <= 0 || mu <= 0 || !Number.isFinite(speed) || !Number.isFinite(mu)) return flag;

  const energy = finiteNumber(0.5 * speed * speed - mu / separation);
  const escapeSpeed = finiteNumber(Math.sqrt((2 * mu) / separation));
  const radialSpeed = finiteNumber(
    (relative.x * displacement.x + relative.y * displacement.y + relative.z * displacement.z) / separation,
  );
  if (energy === null || escapeSpeed === null || radialSpeed === null) return flag;

  flag.specificEnergy = clampFinite(energy);
  flag.escapeSpeed = clampFinite(escapeSpeed);
  flag.radialSpeed = clampFinite(radialSpeed);
  const margin = finiteNumber(options.energyMargin) ?? 0;
  flag.escaped = energy >= margin && (options.outwardOnly !== true || radialSpeed > 0);
  return flag;
}

/** Escape flags for all unique bodies. */
export function escapeFlags(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  options: EscapeFlagOptions = {},
): EscapeFlag[] {
  const flags: EscapeFlag[] = [];
  const seen = new Set<string>();
  const present = buildWorldIndex(world);
  for (const body of bodies) {
    if (!body || seen.has(body.id) || !present.has(body.id)) continue;
    seen.add(body.id);
    flags.push(escapeFlagForBody(world, bodies, body.id, options)!);
  }
  return flags;
}

/** IDs whose specific energy is at or above the configured escape threshold. */
export function escapingBodyIds(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  options: EscapeFlagOptions = {},
): string[] {
  return escapeFlags(world, bodies, options)
    .filter((flag) => flag.escaped)
    .map((flag) => flag.id);
}
