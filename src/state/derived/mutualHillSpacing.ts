/** Mutual Hill radii and sibling spacing measured in mutual Hill radii. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { siblingGroups } from './siblingGroups';
import { hillRadius } from './hillRadius';
import {
  buildWorldIndex,
  compareIds,
  distanceBetween,
  finiteNumber,
  safeDivide,
  worldIndexMap,
  worldPosition,
} from './internal';

export interface MutualHillPair {
  idA: string;
  idB: string;
  separation: number | null;
  mutualHillRadius: number | null;
  /** Separation divided by the mutual Hill radius; null when undefined. */
  spacing: number | null;
}

/** Mean of two neighbouring Hill radii, i.e. the classic mutual Hill radius. */
export function mutualHillRadius(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  idA: string,
  idB: string,
): number | null {
  if (idA === idB) return null;
  const radiusA = hillRadius(world, bodies, idA);
  const radiusB = hillRadius(world, bodies, idB);
  if (radiusA === null || radiusB === null) return null;
  const mean = finiteNumber((radiusA + radiusB) / 2);
  return mean !== null && mean > 0 ? mean : null;
}

/** Separation of two bodies expressed in mutual Hill radii. */
export function mutualHillSpacing(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  idA: string,
  idB: string,
): number | null {
  if (idA === idB) return null;
  const worldById = worldIndexMap(world);
  const indexA = worldById.get(idA);
  const indexB = worldById.get(idB);
  if (indexA === undefined || indexB === undefined) return null;
  const positionA = worldPosition(world, indexA);
  const positionB = worldPosition(world, indexB);
  const radius = mutualHillRadius(world, bodies, idA, idB);
  if (!positionA || !positionB || radius === null) return null;
  return safeDivide(distanceBetween(positionA, positionB), radius);
}

/**
 * Spacing of every unique sibling pair, sorted from tightest to widest.
 * Pairs with undefined spacing are kept at the end for inspection.
 */
export function rankMutualHillSpacings(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
): MutualHillPair[] {
  const present = buildWorldIndex(world);
  const worldById = worldIndexMap(world);
  const pairs: MutualHillPair[] = [];
  const seen = new Set<string>();

  for (const group of siblingGroups(bodies).values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const first = group[i];
        const second = group[j];
        if (!first || !second || first.id === second.id) continue;
        if (!present.has(first.id) || !present.has(second.id)) continue;
        const key = compareIds(first.id, second.id) < 0 ? `${first.id}\u0000${second.id}` : `${second.id}\u0000${first.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const indexA = worldById.get(first.id)!;
        const indexB = worldById.get(second.id)!;
        const positionA = worldPosition(world, indexA);
        const positionB = worldPosition(world, indexB);
        const separation = positionA && positionB ? distanceBetween(positionA, positionB) : null;
        const radius = mutualHillRadius(world, bodies, first.id, second.id);
        pairs.push({
          idA: first.id,
          idB: second.id,
          separation,
          mutualHillRadius: radius,
          spacing: separation !== null && radius !== null ? safeDivide(separation, radius) : null,
        });
      }
    }
  }

  pairs.sort((left, right) => {
    if (left.spacing === null && right.spacing === null) {
      return compareIds(left.idA, right.idA) || compareIds(left.idB, right.idB);
    }
    if (left.spacing === null) return 1;
    if (right.spacing === null) return -1;
    return left.spacing - right.spacing || compareIds(left.idA, right.idA) || compareIds(left.idB, right.idB);
  });
  return pairs;
}
