/** Visibility filtering of body definitions and world slots. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import {
  finiteNumber,
  finitePositive,
  finiteVec3,
  worldIndexMap,
  worldSize,
} from './internal';

export interface VisibleBodyOptions {
  /** Also require a finite physical state (default false). */
  requireFinitePhysical?: boolean;
}

function hasFinitePhysicalState(body: CelestialBody): boolean {
  const physical = body.physical;
  if (!physical) return false;
  return (
    finiteNumber(physical.mass) !== null &&
    finitePositive(physical.radius) !== null &&
    finiteVec3(physical.position) !== null &&
    finiteVec3(physical.velocity) !== null
  );
}

/** Bodies explicitly marked visible; invalid entries are skipped. */
export function visibleBodies(
  bodies: readonly CelestialBody[],
  options: VisibleBodyOptions = {},
): CelestialBody[] {
  return bodies.filter(
    (body) =>
      Boolean(body) &&
      body.visible === true &&
      (options.requireFinitePhysical !== true || hasFinitePhysicalState(body)),
  );
}

/** Unique IDs of visible bodies. */
export function visibleBodyIds(bodies: readonly CelestialBody[], options: VisibleBodyOptions = {}): string[] {
  const ids = new Set<string>();
  for (const body of visibleBodies(bodies, options)) ids.add(body.id);
  return [...ids];
}

/** World slots whose IDs correspond to visible body definitions. */
export function visibleWorldIndices(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  options: VisibleBodyOptions = {},
): number[] {
  const visible = new Set(visibleBodyIds(bodies, options));
  const indices: number[] = [];
  for (let slot = 0; slot < worldSize(world); slot += 1) {
    if (world.ids[slot] && visible.has(world.ids[slot])) indices.push(slot);
  }
  return indices;
}

/** True when a body ID is both present in the world and marked visible. */
export function isVisibleInWorld(world: PhysicsWorld, bodies: readonly CelestialBody[], id: string): boolean {
  return worldIndexMap(world).has(id) && visibleBodyIds(bodies).includes(id);
}
