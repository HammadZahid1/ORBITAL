import { describe, expect, it } from 'vitest';
import { detectCollisions } from '../engine/collision/collision';
import { createBody } from '../data/bodyFactory';
import { getIntegrator } from '../engine/integrators';
import { G } from '../engine/numeric';
import { accelerationAt, computeAccelerations, fieldAcceleration } from '../engine/physics/gravity';
import {
  createPhysicsWorld,
  readVec3,
  restoreLockedBodies,
  setLock,
  syncWorldToBodies,
  transferWorldState,
  worldFromBodies,
} from '../engine/physics/world';
import { predictTrajectory } from '../engine/trajectory/prediction';
import type { CelestialBody } from '../types/celestial';

function body(id: string, x: number): CelestialBody {
  return createBody({
    id,
    name: id,
    mass: 1e24,
    radius: 1e6,
    position: { x, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: x > 0 ? -800 : 800 },
  });
}

function snapshot(world: ReturnType<typeof createPhysicsWorld>) {
  return {
    mass: Array.from(world.mass),
    radius: Array.from(world.radius),
    pos: Array.from(world.pos),
    vel: Array.from(world.vel),
    acc: Array.from(world.acc),
    accPrev: Array.from(world.accPrev),
    locked: Array.from(world.locked),
    accInitialized: world.accInitialized,
    time: world.time,
    steps: world.steps,
    rk4: Object.fromEntries(
      Object.entries(world.rk4).map(([key, buffer]) => [key, Array.from(buffer)]),
    ),
  };
}

describe('world mutation safety', () => {
  it('snapshots physical values when building a world from body definitions', () => {
    const bodies = [body('a', -1e9), body('b', 1e9)];
    const world = worldFromBodies(bodies, { G, softening: 0 });
    const originalX = world.pos[3];
    bodies[1].physical.position.x = 9e12;
    bodies[1].physical.mass = 1;
    bodies[1].visual.color = '#ff0000';

    expect(world.pos[3]).toBe(originalX);
    expect(world.mass[1]).toBe(1e24);
    expect(world.ids).toEqual(['a', 'b']);
    expect(world.softening).toBe(0);
  });

  it('transfers state by id across reordered bodies and ignores unrelated ids', () => {
    const source = worldFromBodies([body('a', -1e9), body('b', 0), body('c', 1e9)], { softening: 0 });
    source.vel[6] = 123;
    source.acc[7] = -45;
    source.time = 321;
    source.steps = 17;
    source.accInitialized = true;

    const target = worldFromBodies([body('c', 5), body('a', 6), body('d', 7)], { softening: 0 });
    transferWorldState(source, target);

    expect(readVec3(target.pos, 0)).toEqual(readVec3(source.pos, 2));
    expect(readVec3(target.vel, 0)).toEqual({ x: 123, y: 0, z: -800 });
    expect(target.acc[1]).toBeCloseTo(source.acc[7], 12);
    expect(readVec3(target.pos, 1)).toEqual(readVec3(source.pos, 0));
    expect(readVec3(target.pos, 2)).toEqual({ x: 7, y: 0, z: 0 });
    expect(target.time).toBe(321);
    expect(target.steps).toBe(17);
    expect(target.accInitialized).toBe(true);
  });

  it('stores the lock anchor on demand and restores only locked bodies', () => {
    const world = worldFromBodies([body('a', -1e9), body('b', 1e9)], { G, softening: 0 });
    setLock(world, 0, true);
    const anchorPosition = readVec3(world.pos, 0);
    const anchorVelocity = readVec3(world.vel, 0);
    const integrator = getIntegrator('velocity-verlet');
    for (let i = 0; i < 50; i += 1) integrator.step(world, 3600, computeAccelerations);
    const freePosition = readVec3(world.pos, 1);

    world.pos[0] = 999;
    world.vel[0] = -999;
    restoreLockedBodies(world);

    expect(readVec3(world.pos, 0)).toEqual(anchorPosition);
    expect(readVec3(world.vel, 0)).toEqual(anchorVelocity);
    expect(readVec3(world.pos, 1)).toEqual(freePosition);
  });

  it('leaves solver arrays and flags untouched when queried by analysis helpers', () => {
    const world = worldFromBodies([body('a', -1e9), body('b', 1e9)], { G, softening: 1e5 });
    world.radius[0] = 1e9;
    world.radius[1] = 1e9;
    world.collisionsEnabled = true;
    computeAccelerations(world);
    const before = snapshot(world);

    accelerationAt(world, 1);
    fieldAcceleration(world, 2e8, 3e8, -4e8);
    readVec3(world.pos, 0);
    detectCollisions(world);

    expect(snapshot(world)).toEqual(before);
  });

  it('predicts repeatedly without mutating the live world or its RK4 scratch space', () => {
    const world = worldFromBodies([body('a', -1e9), body('b', 1e9)], { G, softening: 1e5 });
    computeAccelerations(world);
    world.accPrev.set(world.acc.subarray(0, world.count * 3), 0);
    world.accInitialized = true;
    for (const buffer of Object.values(world.rk4)) buffer.fill(42);
    const before = snapshot(world);

    const options = { steps: 12, dt: 3600, integrator: 'rk4' as const };
    const first = predictTrajectory(world, 1, options);
    const second = predictTrajectory(world, 1, options);

    expect(snapshot(world)).toEqual(before);
    expect(second).toEqual(first);
    expect(first).toHaveLength(13);
    expect(first[12]).not.toEqual(first[0]);
  });

  it('writes independent vector copies back into body definitions', () => {
    const bodies = [body('a', -1e9), body('b', 1e9)];
    const world = worldFromBodies(bodies, { G, softening: 0 });
    computeAccelerations(world);
    syncWorldToBodies(world, bodies);

    const originalX = bodies[0].physical.position.x;
    world.pos[0] = 123;
    expect(bodies[0].physical.position.x).toBe(originalX);

    bodies[0].physical.velocity.x = 456;
    expect(world.vel[0]).not.toBe(456);
    expect(world.pos[0]).toBe(123);
  });
});
