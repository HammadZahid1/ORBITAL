/** Mass-weighted barycentres of arbitrary body subsets and subtrees. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import type { Vec3 } from '../../types/vector';
import { subtreeIds } from './descendants';
import {
  addFinite,
  clampFinite,
  finitePositive,
  finiteVec3,
  safeDivide,
  worldIndexMap,
  worldPosition,
  worldPositiveMass,
} from './internal';

export interface Barycentre {
  /** Total mass that contributed to the average, kilograms. */
  mass: number;
  /** Mass-weighted mean position in the inertial frame, metres. */
  position: Vec3;
}

/** Barycentre of a set of body IDs; null when no finite positive-mass member exists. */
export function barycentreOfIds(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  ids: readonly string[],
): Barycentre | null {
  const worldById = worldIndexMap(world);
  const knownIds = new Set(bodies.map((body) => body?.id));
  let mass = 0;
  let x = 0;
  let y = 0;
  let z = 0;

  for (const id of ids) {
    if (!knownIds.has(id)) continue;
    const index = worldById.get(id);
    if (index === undefined) continue;
    const bodyMass = worldPositiveMass(world, index);
    const position = worldPosition(world, index);
    if (bodyMass === null || !position) continue;
    mass = addFinite(mass, bodyMass);
    x = addFinite(x, bodyMass * position.x);
    y = addFinite(y, bodyMass * position.y);
    z = addFinite(z, bodyMass * position.z);
  }

  if (finitePositive(mass) === null) return null;
  const averageX = safeDivide(x, mass);
  const averageY = safeDivide(y, mass);
  const averageZ = safeDivide(z, mass);
  if (averageX === null || averageY === null || averageZ === null) return null;
  return {
    mass,
    position: { x: clampFinite(averageX), y: clampFinite(averageY), z: clampFinite(averageZ) },
  };
}

/** Barycentre of a subtree, including the root; null for unknown or massless subtrees. */
export function subtreeBarycentre(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  rootId: string,
): Barycentre | null {
  return barycentreOfIds(world, bodies, subtreeIds(bodies, rootId, { includeRoot: true }));
}

/** Barycentre of the whole known world/bodies intersection. */
export function systemBarycentre(world: PhysicsWorld, bodies: readonly CelestialBody[]): Barycentre | null {
  return barycentreOfIds(
    world,
    bodies,
    bodies.map((body) => body?.id),
  );
}

/** Barycentre of already-validated positions and masses (useful for tests and callers). */
export function weightedBarycentre(
  samples: ReadonlyArray<{ mass: number; position: Vec3 }>,
): Barycentre | null {
  let mass = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const sample of samples) {
    const sampleMass = finitePositive(sample?.mass);
    const position = finiteVec3(sample?.position);
    if (sampleMass === null || !position) continue;
    mass = addFinite(mass, sampleMass);
    x = addFinite(x, sampleMass * position.x);
    y = addFinite(y, sampleMass * position.y);
    z = addFinite(z, sampleMass * position.z);
  }
  if (finitePositive(mass) === null) return null;
  const averageX = safeDivide(x, mass);
  const averageY = safeDivide(y, mass);
  const averageZ = safeDivide(z, mass);
  if (averageX === null || averageY === null || averageZ === null) return null;
  return {
    mass,
    position: { x: clampFinite(averageX), y: clampFinite(averageY), z: clampFinite(averageZ) },
  };
}
