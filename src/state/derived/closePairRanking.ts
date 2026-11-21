/** Ranking of close body pairs by instantaneous centre-to-centre distance. */

import type { PhysicsWorld } from '../../engine/physics/world';
import {
  boundedLimit,
  compareIds,
  distanceBetween,
  magnitude,
  subtractVec3,
  worldIdAt,
  worldPosition,
  worldSize,
  worldVelocity,
} from './internal';

export interface ClosePair {
  indexA: number;
  indexB: number;
  idA: string;
  idB: string;
  /** Finite centre-to-centre distance, metres. */
  distance: number;
  /** Finite relative speed, or zero when velocity data is unusable. */
  relativeSpeed: number;
}

export interface ClosePairOptions {
  /** Maximum number of pairs to return; omit for all pairs. */
  limit?: number;
  /** Exclude pairs farther apart than this finite distance. */
  maxDistance?: number;
}

/** All valid pairs sorted from closest to farthest. */
export function rankClosePairs(world: PhysicsWorld, options: ClosePairOptions = {}): ClosePair[] {
  const count = worldSize(world);
  const maxDistance =
    typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0
      ? options.maxDistance
      : Number.POSITIVE_INFINITY;
  const pairs: ClosePair[] = [];

  for (let i = 0; i < count; i += 1) {
    const idA = worldIdAt(world, i);
    const positionA = worldPosition(world, i);
    if (idA === null || !positionA) continue;
    for (let j = i + 1; j < count; j += 1) {
      const idB = worldIdAt(world, j);
      const positionB = worldPosition(world, j);
      if (idB === null || !positionB) continue;
      const distance = distanceBetween(positionA, positionB);
      if (distance > maxDistance) continue;

      let relativeSpeed = 0;
      const velocityA = worldVelocity(world, i);
      const velocityB = worldVelocity(world, j);
      if (velocityA && velocityB) relativeSpeed = magnitude(subtractVec3(velocityB, velocityA));
      pairs.push({ indexA: i, indexB: j, idA, idB, distance, relativeSpeed });
    }
  }

  pairs.sort(
    (left, right) =>
      left.distance - right.distance || compareIds(left.idA, right.idA) || compareIds(left.idB, right.idB),
  );
  return options.limit === undefined ? pairs : pairs.slice(0, boundedLimit(options.limit, pairs.length));
}

/** Closest finite pair in the world, or null when fewer than two bodies are usable. */
export function closestPair(world: PhysicsWorld): ClosePair | null {
  return rankClosePairs(world, { limit: 1 })[0] ?? null;
}
