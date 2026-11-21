/** Body lookup selectors for definition arrays and physics worlds. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import {
  bodyIndexMap,
  lookupBodyIndex,
  lookupWorldIndex,
  worldIdAt,
  worldSize,
} from './internal';

/** Maps every unique body ID to its array index (first occurrence wins). */
export function buildBodyIndex(bodies: readonly CelestialBody[]): Map<string, number> {
  return bodyIndexMap(bodies);
}

/** Array index of a body ID, or -1 when it is absent or malformed. */
export function findBodyIndex(bodies: readonly CelestialBody[], id: string): number {
  return lookupBodyIndex(bodies, id);
}

/** Body definition for an ID, or null when it cannot be found. */
export function findBodyById(bodies: readonly CelestialBody[], id: string): CelestialBody | null {
  const index = findBodyIndex(bodies, id);
  return index >= 0 ? bodies[index] : null;
}

/** Unique, non-empty body IDs in definition order. */
export function uniqueBodyIds(bodies: readonly CelestialBody[]): string[] {
  return [...buildBodyIndex(bodies).keys()];
}

/** Physics-world slot for a body ID, or -1 when the world does not contain it. */
export function findWorldBodyIndex(world: PhysicsWorld, id: string): number {
  return lookupWorldIndex(world, id);
}

/** World ID at a slot, or null for out-of-range/malformed slots. */
export function worldBodyId(world: PhysicsWorld, index: number): string | null {
  return worldIdAt(world, index);
}

/** Number of valid body slots in a world. */
export function worldBodyCount(world: PhysicsWorld): number {
  return worldSize(world);
}
