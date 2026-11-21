/** Total mass of hierarchical subtrees, read from physics-world state. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { subtreeIds } from './descendants';
import { addFinite, finiteOrZero, worldIndexMap, worldMass } from './internal';

/** Sum of positive, finite masses in a subtree including its root. Unknown world IDs contribute zero. */
export function subtreeMass(world: PhysicsWorld, bodies: readonly CelestialBody[], rootId: string): number {
  const ids = subtreeIds(bodies, rootId, { includeRoot: true });
  if (ids.length === 0) return 0;
  const worldById = worldIndexMap(world);
  let total = 0;
  for (const id of ids) {
    const index = worldById.get(id);
    if (index === undefined) continue;
    const mass = worldMass(world, index);
    if (mass === null || mass <= 0) continue;
    total = addFinite(total, mass);
  }
  return finiteOrZero(total);
}

/** Total mass for every unique body ID, treating each as a subtree root. */
export function massBySubtree(world: PhysicsWorld, bodies: readonly CelestialBody[]): Map<string, number> {
  const masses = new Map<string, number>();
  const worldById = worldIndexMap(world);
  for (const body of bodies) {
    if (!body || masses.has(body.id)) continue;
    const index = worldById.get(body.id);
    const mass = index === undefined ? null : worldMass(world, index);
    masses.set(body.id, mass !== null && mass > 0 ? finiteOrZero(mass) : 0);
  }
  return masses;
}
