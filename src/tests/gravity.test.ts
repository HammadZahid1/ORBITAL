import { describe, expect, it } from 'vitest';
import {
  accelerationAt,
  computeAccelerations,
  fieldAcceleration,
  gravitationalAcceleration,
  gravitationalForce,
} from '../engine/physics/gravity';
import { createPhysicsWorld, readVec3, writeVec3 } from '../engine/physics/world';
import { G } from '../engine/numeric';

describe('Newtonian gravity solver', () => {
  it('computes the inverse-square force between point masses', () => {
    expect(gravitationalForce(1, 1, 1, G)).toBeCloseTo(G, 20);
    expect(gravitationalForce(2, 3, 2, G)).toBeCloseTo((G * 6) / 4, 20);
  });

  it('reduces acceleration at distance and regularises zero separation', () => {
    const near = gravitationalAcceleration(1000, 10, G);
    const far = gravitationalAcceleration(1000, 20, G);
    expect(near).toBeCloseTo(far * 4, 12);
    expect(gravitationalAcceleration(1000, 1e-9, G, 0)).toBeGreaterThan(0);
    expect(Number.isFinite(gravitationalAcceleration(1000, 0, G, 0))).toBe(true);
    expect(gravitationalForce(0, 10, 1, G)).toBe(0);
  });

  it('produces equal and opposite accelerations for a pair', () => {
    const world = createPhysicsWorld(2);
    world.count = 2;
    world.G = G;
    world.softening = 0;
    world.mass[0] = 1e24;
    world.mass[1] = 1e23;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
    writeVec3(world.pos, 1, { x: 1e9, y: 0, z: 0 });
    computeAccelerations(world);
    const a0 = readVec3(world.acc, 0);
    const a1 = readVec3(world.acc, 1);
    expect(a0.x).toBeGreaterThan(0);
    expect(a1.x).toBeLessThan(0);
    expect(Math.abs(a0.x * world.mass[0] + a1.x * world.mass[1]) / (a0.x * world.mass[0])).toBeLessThan(
      1e-12,
    );
  });

  it('agrees with the single-body acceleration helper', () => {
    const world = createPhysicsWorld(3);
    world.count = 3;
    world.G = G;
    world.softening = 1e4;
    world.mass[0] = 5e24;
    world.mass[1] = 7e22;
    world.mass[2] = 3e22;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
    writeVec3(world.pos, 1, { x: 1e8, y: 2e8, z: 0 });
    writeVec3(world.pos, 2, { x: -3e8, y: 1e7, z: 5e7 });
    computeAccelerations(world);
    const direct = accelerationAt(world, 0);
    const accumulated = readVec3(world.acc, 0);
    expect(accumulated.x).toBeCloseTo(direct.x, 18);
    expect(accumulated.y).toBeCloseTo(direct.y, 18);
    expect(accumulated.z).toBeCloseTo(direct.z, 18);
  });

  it('evaluates an external field consistently', () => {
    const world = createPhysicsWorld(1);
    world.count = 1;
    world.G = G;
    world.softening = 0;
    world.mass[0] = 1e26;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
    const field = fieldAcceleration(world, 1e9, 0, 0);
    expect(field.x).toBeLessThan(0);
    expect(field.y).toBeCloseTo(0, 12);
    expect(field.z).toBeCloseTo(0, 12);
  });

  it('skips massless bodies and handles coincident positions safely', () => {
    const world = createPhysicsWorld(2);
    world.count = 2;
    world.G = G;
    world.softening = 1e3;
    world.mass[0] = 1e24;
    world.mass[1] = 0;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
    writeVec3(world.pos, 1, { x: 0, y: 0, z: 0 });
    expect(() => computeAccelerations(world)).not.toThrow();
    expect(readVec3(world.acc, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
