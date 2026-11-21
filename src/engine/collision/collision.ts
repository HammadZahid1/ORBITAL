import type { CollisionMode } from '../../types/celestial';
import type { PhysicsWorld } from '../physics/world';

export interface CollisionEvent {
  id: string;
  indexA: number;
  indexB: number;
  idA: string;
  idB: string;
  time: number;
  distance: number;
  relativeSpeed: number;
  penetration: number;
  response: CollisionMode;
  /** True for the body that became inert after a merge. */
  absorbedIndex: number | null;
}

let eventCounter = 0;

function nextEventId(): string {
  eventCounter += 1;
  return `collision-${eventCounter}`;
}

/** Geometric overlap test: centre distance smaller than the sum of radii. */
export function detectCollisions(world: PhysicsWorld): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  if (!world.collisionsEnabled || world.collisionMode === 'none') return events;

  for (let i = 0; i < world.count; i += 1) {
    if (world.mass[i] <= 0) continue;
    for (let j = i + 1; j < world.count; j += 1) {
      if (world.mass[j] <= 0) continue;
      const dx = world.pos[j * 3] - world.pos[i * 3];
      const dy = world.pos[j * 3 + 1] - world.pos[i * 3 + 1];
      const dz = world.pos[j * 3 + 2] - world.pos[i * 3 + 2];
      const distance = Math.hypot(dx, dy, dz);
      const contact = world.radius[i] + world.radius[j];
      if (distance >= contact) continue;

      const rvx = world.vel[j * 3] - world.vel[i * 3];
      const rvy = world.vel[j * 3 + 1] - world.vel[i * 3 + 1];
      const rvz = world.vel[j * 3 + 2] - world.vel[i * 3 + 2];
      events.push({
        id: nextEventId(),
        indexA: i,
        indexB: j,
        idA: world.ids[i],
        idB: world.ids[j],
        time: world.time,
        distance,
        relativeSpeed: Math.hypot(rvx, rvy, rvz),
        penetration: contact - distance,
        response: world.collisionMode,
        absorbedIndex: null,
      });
    }
  }
  return events;
}

/**
 * Applies a simplified impulse-based response to detected overlaps.
 *
 * These are illustrative rigid-sphere models. Real astrophysical collisions
 * involve deformation, fragmentation, shock heating and gravity during
 * contact, none of which are represented here.
 */
export function resolveCollisions(
  world: PhysicsWorld,
  events: readonly CollisionEvent[],
  mode: CollisionMode = world.collisionMode,
): CollisionEvent[] {
  if (mode === 'none') return [];

  const handled: CollisionEvent[] = [];
  for (const event of events) {
    const i = event.indexA;
    const j = event.indexB;
    if (world.mass[i] <= 0 || world.mass[j] <= 0) continue;

    if (mode === 'merge') {
      const totalMass = world.mass[i] + world.mass[j];
      const massA = world.mass[i];
      const massB = world.mass[j];
      for (let component = 0; component < 3; component += 1) {
        world.pos[i * 3 + component] =
          (world.pos[i * 3 + component] * massA + world.pos[j * 3 + component] * massB) / totalMass;
        world.vel[i * 3 + component] =
          (world.vel[i * 3 + component] * massA + world.vel[j * 3 + component] * massB) / totalMass;
      }
      // Conserve volume for the simplified merged sphere.
      world.radius[i] = Math.cbrt(world.radius[i] ** 3 + world.radius[j] ** 3);
      world.mass[i] = totalMass;
      world.mass[j] = 0;
      world.vel[j * 3] = 0;
      world.vel[j * 3 + 1] = 0;
      world.vel[j * 3 + 2] = 0;
      handled.push({ ...event, response: 'merge', absorbedIndex: j });
      continue;
    }

    const restitution = mode === 'elastic' ? 1 : 0;
    const mi = world.mass[i];
    const mj = world.mass[j];
    let nx = world.pos[j * 3] - world.pos[i * 3];
    let ny = world.pos[j * 3 + 1] - world.pos[i * 3 + 1];
    let nz = world.pos[j * 3 + 2] - world.pos[i * 3 + 2];
    const distance = Math.hypot(nx, ny, nz);
    if (distance < 1e-9) {
      nx = 1;
      ny = 0;
      nz = 0;
    } else {
      nx /= distance;
      ny /= distance;
      nz /= distance;
    }

    const rvx = world.vel[j * 3] - world.vel[i * 3];
    const rvy = world.vel[j * 3 + 1] - world.vel[i * 3 + 1];
    const rvz = world.vel[j * 3 + 2] - world.vel[i * 3 + 2];
    const normalSpeed = rvx * nx + rvy * ny + rvz * nz;
    if (normalSpeed > 0) continue;

    const impulse = (-(1 + restitution) * normalSpeed) / (1 / mi + 1 / mj);
    world.vel[i * 3] -= (impulse / mi) * nx;
    world.vel[i * 3 + 1] -= (impulse / mi) * ny;
    world.vel[i * 3 + 2] -= (impulse / mi) * nz;
    world.vel[j * 3] += (impulse / mj) * nx;
    world.vel[j * 3 + 1] += (impulse / mj) * ny;
    world.vel[j * 3 + 2] += (impulse / mj) * nz;

    // Separate overlapping spheres proportionally to inverse mass.
    const correction = (event.penetration * 1.001) / (1 / mi + 1 / mj);
    world.pos[i * 3] -= (correction / mi) * nx;
    world.pos[i * 3 + 1] -= (correction / mi) * ny;
    world.pos[i * 3 + 2] -= (correction / mi) * nz;
    world.pos[j * 3] += (correction / mj) * nx;
    world.pos[j * 3 + 1] += (correction / mj) * ny;
    world.pos[j * 3 + 2] += (correction / mj) * nz;
    handled.push({ ...event, response: mode });
  }
  return handled;
}

export function resetCollisionEventIds(): void {
  eventCounter = 0;
}
