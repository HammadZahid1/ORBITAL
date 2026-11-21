/** Pure geometric collision candidates; no events are emitted or state mutated. */

import type { PhysicsWorld } from '../../engine/physics/world';
import {
  compareIds,
  distanceBetween,
  finiteNumber,
  magnitude,
  subtractVec3,
  worldIdAt,
  worldPosition,
  worldPositiveMass,
  worldRadius,
  worldSize,
  worldVelocity,
} from './internal';

export interface CollisionCandidatePair {
  indexA: number;
  indexB: number;
  idA: string;
  idB: string;
  /** Centre-to-centre separation, metres. */
  distance: number;
  /** Amount by which the bounding spheres overlap, metres. */
  penetration: number;
  /** Finite relative speed, or zero when velocity data is unusable. */
  relativeSpeed: number;
}

export interface CollisionCandidateOptions {
  /** Honour `collisionsEnabled` / `collisionMode` (default false). */
  enabledOnly?: boolean;
  /** Skip zero, negative and non-finite masses (default true). */
  requireMass?: boolean;
}

/** Unique overlapping sphere pairs, ordered by deepest penetration first. */
export function collisionCandidatePairs(
  world: PhysicsWorld,
  options: CollisionCandidateOptions = {},
): CollisionCandidatePair[] {
  if (options.enabledOnly && (!world.collisionsEnabled || world.collisionMode === 'none')) return [];
  const requireMass = options.requireMass !== false;
  const count = worldSize(world);
  const pairs: CollisionCandidatePair[] = [];

  for (let i = 0; i < count; i += 1) {
    const idA = worldIdAt(world, i);
    const radiusA = worldRadius(world, i);
    const positionA = worldPosition(world, i);
    if (idA === null || radiusA === null || !positionA) continue;
    if (requireMass && worldPositiveMass(world, i) === null) continue;

    for (let j = i + 1; j < count; j += 1) {
      const idB = worldIdAt(world, j);
      const radiusB = worldRadius(world, j);
      const positionB = worldPosition(world, j);
      if (idB === null || radiusB === null || !positionB) continue;
      if (requireMass && worldPositiveMass(world, j) === null) continue;

      const contact = finiteNumber(radiusA + radiusB);
      if (contact === null) continue;
      const distance = distanceBetween(positionA, positionB);
      if (distance >= contact) continue;

      let relativeSpeed = 0;
      const velocityA = worldVelocity(world, i);
      const velocityB = worldVelocity(world, j);
      if (velocityA && velocityB) relativeSpeed = magnitude(subtractVec3(velocityB, velocityA));
      pairs.push({
        indexA: i,
        indexB: j,
        idA,
        idB,
        distance,
        penetration: finiteNumber(contact - distance) ?? 0,
        relativeSpeed,
      });
    }
  }

  pairs.sort(
    (left, right) =>
      right.penetration - left.penetration || compareIds(left.idA, right.idA) || compareIds(left.idB, right.idB),
  );
  return pairs;
}

/** True when any two valid bodies have overlapping bounding spheres. */
export function hasCollisionCandidates(world: PhysicsWorld, options: CollisionCandidateOptions = {}): boolean {
  return collisionCandidatePairs(world, options).length > 0;
}

/** Deepest overlapping pair, or null when there is no overlap. */
export function deepestCollisionCandidate(
  world: PhysicsWorld,
  options: CollisionCandidateOptions = {},
): CollisionCandidatePair | null {
  return collisionCandidatePairs(world, options)[0] ?? null;
}
