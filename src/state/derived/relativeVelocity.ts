/** Velocity of each body relative to its hierarchical parent. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import type { Vec3 } from '../../types/vector';
import { findBodyById } from './bodyIndex';
import {
  buildWorldIndex,
  magnitude,
  subtractVec3,
  worldIndexMap,
  worldVelocity,
} from './internal';

/** Parent-relative velocity vector, or null for roots/unknown/non-finite state. */
export function relativeVelocityToParent(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  id: string,
): Vec3 | null {
  const body = findBodyById(bodies, id);
  if (!body || typeof body.parentId !== 'string') return null;
  const parent = findBodyById(bodies, body.parentId);
  if (!parent || parent.id === body.id) return null;

  const worldById = worldIndexMap(world);
  const bodyIndex = worldById.get(id);
  const parentIndex = worldById.get(parent.id);
  if (bodyIndex === undefined || parentIndex === undefined) return null;
  const bodyVelocity = worldVelocity(world, bodyIndex);
  const parentVelocity = worldVelocity(world, parentIndex);
  if (!bodyVelocity || !parentVelocity) return null;
  return subtractVec3(bodyVelocity, parentVelocity);
}

/** Magnitude of {@link relativeVelocityToParent}; zero when it is undefined. */
export function relativeSpeedToParent(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  id: string,
): number {
  const velocity = relativeVelocityToParent(world, bodies, id);
  return velocity ? magnitude(velocity) : 0;
}

/** Parent-relative velocities keyed by unique body ID. */
export function relativeVelocitiesToParents(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
): Map<string, Vec3> {
  const velocities = new Map<string, Vec3>();
  const present = buildWorldIndex(world);
  for (const body of bodies) {
    if (!body || velocities.has(body.id) || !present.has(body.id)) continue;
    const velocity = relativeVelocityToParent(world, bodies, body.id);
    if (velocity) velocities.set(body.id, velocity);
  }
  return velocities;
}
