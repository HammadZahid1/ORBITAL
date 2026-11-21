import { describe, expect, it } from 'vitest';
import {
  detectCollisions,
  resolveCollisions,
  resetCollisionEventIds,
} from '../engine/collision/collision';
import { kineticEnergy, totalLinearMomentum } from '../engine/energy/energy';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';
import type { CollisionMode } from '../types/celestial';
import type { Vec3 } from '../types/vector';

function collidingWorld(
  positions: Vec3[],
  velocities: Vec3[],
  mode: CollisionMode = 'elastic',
  masses = [2, 2],
  radii = [1, 1],
) {
  const world = createPhysicsWorld(positions.length);
  world.count = positions.length;
  world.collisionsEnabled = true;
  world.collisionMode = mode;
  world.time = 42;
  for (let i = 0; i < positions.length; i += 1) {
    world.mass[i] = masses[i];
    world.radius[i] = radii[i];
    world.ids.push(`body-${i}`);
    writeVec3(world.pos, i, positions[i]);
    writeVec3(world.vel, i, velocities[i]);
  }
  return world;
}

describe('collision edge cases', () => {
  it('treats exact contact as a miss and any penetration as a hit', () => {
    const touching = collidingWorld(
      [
        { x: -1, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ],
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ],
    );
    expect(detectCollisions(touching)).toHaveLength(0);

    touching.pos[3] = 0.999;
    const events = detectCollisions(touching);
    expect(events).toHaveLength(1);
    expect(events[0].penetration).toBeCloseTo(0.001, 12);
    expect(events[0].time).toBe(42);
    expect(events[0].distance).toBeCloseTo(1.999, 12);
  });

  it('ignores separating bodies even while their spheres overlap', () => {
    const world = collidingWorld(
      [
        { x: -0.5, y: 0, z: 0 },
        { x: 0.5, y: 0, z: 0 },
      ],
      [
        { x: -4, y: 1, z: 2 },
        { x: 3, y: -1, z: 0 },
      ],
    );
    const events = detectCollisions(world);
    expect(events).toHaveLength(1);
    const before = Array.from(world.vel.subarray(0, world.count * 3));
    expect(resolveCollisions(world, events, 'elastic')).toHaveLength(0);
    expect(Array.from(world.vel.subarray(0, world.count * 3))).toEqual(before);
  });

  it('leaves tangential velocity untouched for a grazing elastic impact', () => {
    const world = collidingWorld(
      [
        { x: 0, y: 0, z: 0 },
        { x: 1.5, y: 0, z: 0 },
      ],
      [
        { x: 0, y: 3, z: -1 },
        { x: -2, y: 3, z: -1 },
      ],
    );
    const initialMomentum = totalLinearMomentum(world);
    const initialKinetic = kineticEnergy(world);
    const events = detectCollisions(world);
    expect(resolveCollisions(world, events, 'elastic')).toHaveLength(1);

    // Equal masses swap the normal (x) component; y and z are the contact tangent.
    expect(world.vel[0]).toBeCloseTo(-2, 12);
    expect(world.vel[3]).toBeCloseTo(0, 12);
    expect(world.vel[1]).toBeCloseTo(3, 12);
    expect(world.vel[4]).toBeCloseTo(3, 12);
    expect(world.vel[2]).toBeCloseTo(-1, 12);
    expect(world.vel[5]).toBeCloseTo(-1, 12);
    expect(totalLinearMomentum(world).x).toBeCloseTo(initialMomentum.x, 12);
    expect(kineticEnergy(world)).toBeCloseTo(initialKinetic, 12);
    // Position correction resolves the overlap along the contact normal only.
    expect(world.pos[1]).toBeCloseTo(0, 12);
    expect(world.pos[4]).toBeCloseTo(0, 12);
    expect(world.pos[3] - world.pos[0]).toBeGreaterThan(2);
  });

  it('removes only the normal relative speed in a perfectly inelastic impact', () => {
    const world = collidingWorld(
      [
        { x: -0.9, y: 0, z: 0 },
        { x: 0.9, y: 0, z: 0 },
      ],
      [
        { x: 2, y: -3, z: 1 },
        { x: -1, y: 4, z: -2 },
      ],
      'inelastic',
      [3, 1],
    );
    const initialMomentum = totalLinearMomentum(world);
    resolveCollisions(world, detectCollisions(world), 'inelastic');

    const commonNormalSpeed = (3 * 2 + 1 * -1) / 4;
    expect(world.vel[0]).toBeCloseTo(commonNormalSpeed, 12);
    expect(world.vel[3]).toBeCloseTo(commonNormalSpeed, 12);
    expect(world.vel[1]).toBeCloseTo(-3, 12);
    expect(world.vel[4]).toBeCloseTo(4, 12);
    expect(world.vel[2]).toBeCloseTo(1, 12);
    expect(world.vel[5]).toBeCloseTo(-2, 12);
    expect(totalLinearMomentum(world).x).toBeCloseTo(initialMomentum.x, 12);
    expect(kineticEnergy(world)).toBeLessThan(
      0.5 * 3 * (2 ** 2 + 3 ** 2 + 1) + 0.5 * (1 ** 2 + 4 ** 2 + 2 ** 2),
    );
  });

  it('handles a triple overlap as chained merges without losing mass or momentum', () => {
    resetCollisionEventIds();
    const world = collidingWorld(
      [
        { x: -0.8, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0.8, y: 0, z: 0 },
      ],
      [
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
      ],
      'merge',
      [2, 3, 5],
      [1, 1, 1],
    );
    const initialMomentum = totalLinearMomentum(world).x;
    const events = detectCollisions(world);
    expect(events).toHaveLength(3);
    expect(new Set(events.map((event) => event.id)).size).toBe(3);
    expect(events.map((event) => event.penetration > 0).every(Boolean)).toBe(true);

    const handled = resolveCollisions(world, events, 'merge');
    expect(handled.map((event) => event.absorbedIndex)).toEqual([1, 2]);
    expect(world.mass[0]).toBe(10);
    expect(world.mass[1]).toBe(0);
    expect(world.mass[2]).toBe(0);
    expect(world.vel[0]).toBeCloseTo((2 * 1 + 3 * 2 + 5 * 3) / 10, 12);
    expect(10 * world.vel[0]).toBeCloseTo(initialMomentum, 12);
    expect(resolveCollisions(world, events, 'none')).toHaveLength(0);
    resetCollisionEventIds();
  });
});
