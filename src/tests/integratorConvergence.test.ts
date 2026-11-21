import { describe, expect, it } from 'vitest';
import { G } from '../engine/numeric';
import { computeEnergy } from '../engine/energy/energy';
import { getIntegrator } from '../engine/integrators';
import { computeAccelerations } from '../engine/physics/gravity';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';
import type { IntegratorId } from '../types/celestial';

// Equal masses in a barycentric circular orbit give an analytically known path,
// so both energy drift and phase error can be measured without a locked primary.
const MASS = 5.9722e24;
const SEPARATION = 3.844e8;
const ORBIT_RADIUS = SEPARATION / 2;
const ORBIT_SPEED = Math.sqrt((G * MASS) / (2 * SEPARATION));
const ANGULAR_RATE = ORBIT_SPEED / ORBIT_RADIUS;
const PERIOD = (2 * Math.PI) / ANGULAR_RATE;

function circularBinary() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.G = G;
  world.softening = 0;
  world.mass[0] = MASS;
  world.mass[1] = MASS;
  world.radius[0] = 1e6;
  world.radius[1] = 1e6;
  writeVec3(world.pos, 0, { x: -ORBIT_RADIUS, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: ORBIT_RADIUS, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 0, y: 0, z: -ORBIT_SPEED });
  writeVec3(world.vel, 1, { x: 0, y: 0, z: ORBIT_SPEED });
  computeAccelerations(world);
  world.accPrev.set(world.acc.subarray(0, world.count * 3), 0);
  world.accInitialized = true;
  return world;
}

function relativePositionError(world: ReturnType<typeof circularBinary>): number {
  const t = world.time;
  const expectedX = ORBIT_RADIUS * Math.cos(ANGULAR_RATE * t);
  const expectedZ = ORBIT_RADIUS * Math.sin(ANGULAR_RATE * t);
  return (
    Math.hypot(world.pos[3] - expectedX, world.pos[4], world.pos[5] - expectedZ) / SEPARATION
  );
}

function propagate(id: IntegratorId, stepsPerOrbit: number, orbits: number) {
  const world = circularBinary();
  const initialEnergy = computeEnergy(world).total;
  const integrator = getIntegrator(id);
  const dt = PERIOD / stepsPerOrbit;
  let maxEnergyDrift = 0;
  for (let step = 0; step < stepsPerOrbit * orbits; step += 1) {
    integrator.step(world, dt, computeAccelerations);
    world.time += dt;
    const drift = Math.abs((computeEnergy(world).total - initialEnergy) / initialEnergy);
    if (drift > maxEnergyDrift) maxEnergyDrift = drift;
  }
  const finalEnergyDrift = Math.abs((computeEnergy(world).total - initialEnergy) / initialEnergy);
  return { world, maxEnergyDrift, finalEnergyDrift, positionError: relativePositionError(world) };
}

const IDs: IntegratorId[] = ['euler', 'semi-implicit-euler', 'velocity-verlet', 'rk4'];

describe('integrator convergence on a circular binary', () => {
  it('separates the methods by bounded energy error over four orbits', () => {
    const results = Object.fromEntries(IDs.map((id) => [id, propagate(id, 200, 4)])) as Record<
      IntegratorId,
      ReturnType<typeof propagate>
    >;

    for (const id of IDs) {
      expect(Number.isFinite(results[id].maxEnergyDrift)).toBe(true);
    }
    // Explicit Euler gains energy without bound, even at 200 steps per orbit.
    expect(results.euler.maxEnergyDrift).toBeGreaterThan(0.1);
    // Both symplectic methods keep the oscillation envelope far below Euler.
    expect(results['semi-implicit-euler'].maxEnergyDrift).toBeLessThan(
      results.euler.maxEnergyDrift / 20,
    );
    expect(results['velocity-verlet'].maxEnergyDrift).toBeLessThan(
      results['semi-implicit-euler'].maxEnergyDrift / 100,
    );
    // RK4 is more accurate here than symplectic Euler or Verlet, but it is not
    // symplectic; the next case checks its secular drift explicitly.
    expect(results.rk4.maxEnergyDrift).toBeLessThan(
      results['velocity-verlet'].maxEnergyDrift / 2,
    );
    expect(results.rk4.positionError).toBeLessThan(1e-5);
    expect(results.euler.positionError).toBeGreaterThan(0.1);
  });

  it('reduces energy drift when the step size is halved at a fixed horizon', () => {
    const coarse = Object.fromEntries(IDs.map((id) => [id, propagate(id, 200, 4)])) as Record<
      IntegratorId,
      ReturnType<typeof propagate>
    >;
    const fine = Object.fromEntries(IDs.map((id) => [id, propagate(id, 400, 4)])) as Record<
      IntegratorId,
      ReturnType<typeof propagate>
    >;

    for (const id of IDs) {
      expect(fine[id].maxEnergyDrift).toBeLessThan(coarse[id].maxEnergyDrift);
      expect(fine[id].positionError).toBeLessThan(coarse[id].positionError);
    }
    // Refinement factors are deliberately loose: they express the observed
    // convergence trend, not an exact asymptotic-order measurement.
    expect(coarse['semi-implicit-euler'].maxEnergyDrift / fine['semi-implicit-euler'].maxEnergyDrift).toBeGreaterThan(2);
    expect(coarse['velocity-verlet'].maxEnergyDrift / fine['velocity-verlet'].maxEnergyDrift).toBeGreaterThan(4);
    expect(coarse.rk4.maxEnergyDrift / fine.rk4.maxEnergyDrift).toBeGreaterThan(8);
    expect(coarse.euler.maxEnergyDrift / fine.euler.maxEnergyDrift).toBeGreaterThan(1.05);
  });

  it('keeps symplectic energy error bounded over a longer run while RK4 drifts secularly', () => {
    const shortRun = Object.fromEntries(
      ['velocity-verlet', 'semi-implicit-euler', 'rk4'].map((id) => [
        id,
        propagate(id as IntegratorId, 200, 4),
      ]),
    ) as Record<string, ReturnType<typeof propagate>>;
    const longRun = Object.fromEntries(
      ['velocity-verlet', 'semi-implicit-euler', 'rk4'].map((id) => [
        id,
        propagate(id as IntegratorId, 200, 20),
      ]),
    ) as Record<string, ReturnType<typeof propagate>>;

    // Symplectic integrators exchange energy with the numerical Hamiltonian;
    // their global envelope does not grow with integration time here.
    expect(longRun['velocity-verlet'].maxEnergyDrift).toBeLessThanOrEqual(
      shortRun['velocity-verlet'].maxEnergyDrift * 1.01,
    );
    expect(longRun['semi-implicit-euler'].maxEnergyDrift).toBeLessThanOrEqual(
      shortRun['semi-implicit-euler'].maxEnergyDrift * 1.01,
    );
    // RK4's fourth-order truncation error accumulates instead of oscillating.
    expect(longRun.rk4.finalEnergyDrift).toBeGreaterThan(shortRun.rk4.finalEnergyDrift * 3);
    expect(longRun.rk4.positionError).toBeGreaterThan(shortRun.rk4.positionError);
  });
});
