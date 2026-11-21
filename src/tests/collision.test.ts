import { describe, expect, it } from 'vitest';
import {
  detectCollisions,
  resetCollisionEventIds,
  resolveCollisions,
} from '../engine/collision/collision';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';

function approachingWorld() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.collisionsEnabled = true;
  world.collisionMode = 'elastic';
  world.mass[0] = 10;
  world.mass[1] = 5;
  world.radius[0] = 1;
  world.radius[1] = 1;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: 1.5, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 1, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: -1, y: 0, z: 0 });
  return world;
}

describe('collision detection and response', () => {
  it('detects geometric overlaps only when enabled', () => {
    const world = approachingWorld();
    expect(detectCollisions(world)).toHaveLength(1);
    world.collisionsEnabled = false;
    expect(detectCollisions(world)).toHaveLength(0);
  });

  it('applies an elastic impulse that reverses relative velocity', () => {
    const world = approachingWorld();
    const events = detectCollisions(world);
    resolveCollisions(world, events, 'elastic');
    const relativeAfter = world.vel[3] - world.vel[0];
    const relativeBefore = 2;
    expect(relativeAfter).toBeCloseTo(relativeBefore, 8);
    expect(world.mass[0]).toBe(10);
  });

  it('applies a perfectly inelastic impulse that equalises velocities', () => {
    const world = approachingWorld();
    resolveCollisions(world, detectCollisions(world), 'inelastic');
    expect(world.vel[0]).toBeCloseTo(world.vel[3], 10);
    expect((world.mass[0] * world.vel[0] + world.mass[1] * world.vel[3]) / 15).toBeCloseTo(
      1 / 3,
      8,
    );
  });

  it('merges bodies while conserving mass and momentum', () => {
    const world = approachingWorld();
    const events = detectCollisions(world);
    const resolved = resolveCollisions(world, events, 'merge');
    expect(resolved[0].absorbedIndex).toBe(1);
    expect(world.mass[0]).toBe(15);
    expect(world.mass[1]).toBe(0);
    expect(world.radius[0]).toBeCloseTo(Math.cbrt(2), 10);
    expect(world.vel[0]).toBeCloseTo(1 / 3, 8);
    expect(detectCollisions(world)).toHaveLength(0);
  });

  it('handles coincident bodies without dividing by zero', () => {
    const world = approachingWorld();
    writeVec3(world.pos, 1, { x: 0, y: 0, z: 0 });
    const events = detectCollisions(world);
    expect(events[0].distance).toBe(0);
    expect(() => resolveCollisions(world, events, 'elastic')).not.toThrow();
    expect(Number.isFinite(world.vel[3])).toBe(true);
    resetCollisionEventIds();
  });
});
