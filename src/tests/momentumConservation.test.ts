import { describe, expect, it } from 'vitest';
import {
  detectCollisions,
  resolveCollisions,
  resetCollisionEventIds,
} from '../engine/collision/collision';
import { centerOfMass, centerOfMassVelocity, shiftToBarycentricFrame } from '../engine/coordinates/barycenter';
import {
  computeEnergy,
  kineticEnergy,
  totalAngularMomentum,
  totalLinearMomentum,
} from '../engine/energy/energy';
import { getIntegrator } from '../engine/integrators';
import { G } from '../engine/numeric';
import { computeAccelerations } from '../engine/physics/gravity';
import { createPhysicsWorld, readVec3, writeVec3 } from '../engine/physics/world';
import type { IntegratorId } from '../types/celestial';
import type { Vec3 } from '../types/vector';

function interactingWorld() {
  const world = createPhysicsWorld(3);
  world.count = 3;
  world.G = G;
  world.softening = 0;
  const masses = [2e24, 3e24, 1e24];
  const positions: Vec3[] = [
    { x: -1e9, y: 2e8, z: 0 },
    { x: 8e8, y: -4e8, z: 3e8 },
    { x: 2e8, y: 9e8, z: -2e8 },
  ];
  const velocities: Vec3[] = [
    { x: 2e-4, y: 0, z: 1e-4 },
    { x: -1e-4, y: 3e-4, z: 0 },
    { x: 0, y: -2e-4, z: 5e-4 },
  ];
  for (let i = 0; i < 3; i += 1) {
    world.mass[i] = masses[i];
    writeVec3(world.pos, i, positions[i]);
    writeVec3(world.vel, i, velocities[i]);
  }
  computeAccelerations(world);
  return world;
}

function relativeChange(before: Vec3, after: Vec3): number {
  return (
    Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z) /
    Math.max(Math.hypot(before.x, before.y, before.z), 1e-30)
  );
}

function collisionWorld(masses: number[], positions: Vec3[], velocities: Vec3[], radii: number[]) {
  const world = createPhysicsWorld(masses.length);
  world.count = masses.length;
  world.collisionsEnabled = true;
  world.collisionMode = 'elastic';
  world.time = 1234;
  for (let i = 0; i < masses.length; i += 1) {
    world.mass[i] = masses[i];
    world.radius[i] = radii[i];
    world.ids.push(`body-${i}`);
    writeVec3(world.pos, i, positions[i]);
    writeVec3(world.vel, i, velocities[i]);
  }
  return world;
}

describe('conservation laws', () => {
  it('keeps net linear momentum fixed for every integrator in a 3D N-body system', () => {
    const ids: IntegratorId[] = ['euler', 'semi-implicit-euler', 'velocity-verlet', 'rk4'];
    for (const id of ids) {
      const world = interactingWorld();
      const initial = totalLinearMomentum(world);
      const initialComVelocity = centerOfMassVelocity(world);
      const integrator = getIntegrator(id);
      for (let step = 0; step < 600; step += 1) {
        integrator.step(world, 5000, computeAccelerations);
      }
      // Round-off from hundreds of force evaluations is ~1e-10 relative;
      // any real momentum leak would be orders of magnitude larger.
      expect(relativeChange(initial, totalLinearMomentum(world))).toBeLessThan(1e-8);
      expect(relativeChange(initialComVelocity, centerOfMassVelocity(world))).toBeLessThan(1e-8);
    }
  });

  it('preserves total angular momentum about a fixed barycentre', () => {
    const world = interactingWorld();
    shiftToBarycentricFrame(world);
    const initial = totalAngularMomentum(world);
    const initialCom = centerOfMass(world);
    const integrator = getIntegrator('velocity-verlet');
    for (let step = 0; step < 800; step += 1) {
      integrator.step(world, 5000, computeAccelerations);
    }
    expect(relativeChange(initial, totalAngularMomentum(world))).toBeLessThan(1e-9);
    // Zero net momentum means the centre of mass cannot drift.
    expect(Math.hypot(centerOfMass(world).x - initialCom.x, centerOfMass(world).z - initialCom.z)).toBeLessThan(1e-6);
  });

  it('conserves momentum and kinetic energy in an oblique elastic impact', () => {
    resetCollisionEventIds();
    const world = collisionWorld(
      [3, 1],
      [
        { x: -0.8, y: 0, z: 0 },
        { x: 0.8, y: 0, z: 0 },
      ],
      [
        { x: 2, y: 1, z: 0 },
        { x: -1, y: -0.5, z: 0 },
      ],
      [1, 1],
    );
    const events = detectCollisions(world);
    expect(events).toHaveLength(1);
    const initialMomentum = computeEnergy(world).linearMomentum;
    const initialKinetic = kineticEnergy(world);

    const handled = resolveCollisions(world, events, 'elastic');
    expect(handled).toHaveLength(1);

    expect(relativeChange(initialMomentum, totalLinearMomentum(world))).toBeLessThan(1e-12);
    expect(Math.abs(kineticEnergy(world) - initialKinetic) / initialKinetic).toBeLessThan(1e-12);
    // The contact normal is x, so tangential velocity is untouched.
    expect(world.vel[1]).toBeCloseTo(1, 12);
    expect(world.vel[4]).toBeCloseTo(-0.5, 12);
    // The normal impulse uses the reduced mass: J = -(1+e)·v_rel·μ = 4.5.
    expect(world.vel[0]).toBeCloseTo(0.5, 12);
    expect(world.vel[3]).toBeCloseTo(3.5, 12);
    resetCollisionEventIds();
  });

  it('keeps the centre of mass and total momentum fixed when bodies merge in 3D', () => {
    resetCollisionEventIds();
    const world = collisionWorld(
      [4, 1],
      [
        { x: -2, y: 1, z: 0.5 },
        { x: 3, y: -1, z: -0.5 },
      ],
      [
        { x: 1, y: 0, z: 2 },
        { x: -2, y: 1, z: 0 },
      ],
      [5, 5],
    );
    const initialMomentum = totalLinearMomentum(world);
    const initialCom = centerOfMass(world);
    const initialVolume = 2 * 5 ** 3;

    resolveCollisions(world, detectCollisions(world), 'merge');

    expect(world.mass[0]).toBe(5);
    expect(world.mass[1]).toBe(0);
    expect(relativeChange(initialMomentum, totalLinearMomentum(world))).toBeLessThan(1e-12);
    const finalCom = centerOfMass(world);
    expect(Math.hypot(finalCom.x - initialCom.x, finalCom.y - initialCom.y, finalCom.z - initialCom.z)).toBeLessThan(1e-12);
    expect(world.radius[0] ** 3).toBeCloseTo(initialVolume, 10);
    expect(readVec3(world.vel, 1)).toEqual({ x: 0, y: 0, z: 0 });
    resetCollisionEventIds();
  });
});
