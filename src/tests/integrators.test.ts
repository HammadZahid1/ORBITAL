import { describe, expect, it } from 'vitest';
import { AU, EARTH_MASS, G, SOLAR_MASS } from '../engine/numeric';
import { computeEnergy } from '../engine/energy/energy';
import { getIntegrator, INTEGRATOR_LIST } from '../engine/integrators';
import { computeAccelerations } from '../engine/physics/gravity';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';
import type { IntegratorId } from '../types/celestial';

function circularWorld() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.G = G;
  world.softening = 0;
  world.mass[0] = SOLAR_MASS;
  world.mass[1] = EARTH_MASS;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: AU, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: 0, y: 0, z: Math.sqrt((G * SOLAR_MASS) / AU) });
  computeAccelerations(world);
  return world;
}

function relativeDrift(id: IntegratorId, steps: number): number {
  const world = circularWorld();
  const initial = computeEnergy(world).total;
  const integrator = getIntegrator(id);
  for (let i = 0; i < steps; i += 1) integrator.step(world, 1800, computeAccelerations);
  const final = computeEnergy(world).total;
  return Math.abs((final - initial) / initial);
}

describe('numerical integrators', () => {
  it('registers four distinct integrators with documented orders', () => {
    expect(INTEGRATOR_LIST).toHaveLength(4);
    expect(getIntegrator('euler').order).toBe(1);
    expect(getIntegrator('semi-implicit-euler').order).toBe(1);
    expect(getIntegrator('velocity-verlet').order).toBe(2);
    expect(getIntegrator('rk4').order).toBe(4);
    expect(getIntegrator('rk4').evaluations).toBe(4);
  });

  it('advances bodies under gravity for every integrator', () => {
    for (const integrator of INTEGRATOR_LIST) {
      const world = circularWorld();
      const before = world.pos[5];
      integrator.step(world, 3600, computeAccelerations);
      expect(world.pos[5]).not.toBe(before);
      expect(Number.isFinite(world.vel[4])).toBe(true);
    }
  });

  it('keeps a circular orbit bounded with symplectic and high-order methods', () => {
    for (const id of ['velocity-verlet', 'rk4', 'semi-implicit-euler'] as IntegratorId[]) {
      const drift = relativeDrift(id, 1200);
      expect(Number.isFinite(drift)).toBe(true);
      expect(drift).toBeLessThan(0.05);
    }
  });

  it('demonstrates larger energy drift for explicit Euler', () => {
    const euler = relativeDrift('euler', 1200);
    const verlet = relativeDrift('velocity-verlet', 1200);
    expect(euler).toBeGreaterThan(verlet);
  });

  it('Velocity Verlet stays stable when the acceleration cache is reused', () => {
    const world = circularWorld();
    const integrator = getIntegrator('velocity-verlet');
    for (let i = 0; i < 600; i += 1) integrator.step(world, 900, computeAccelerations);
    expect(world.accInitialized).toBe(true);
    expect(Number.isFinite(world.pos[3])).toBe(true);
    expect(world.pos[3]).toBeGreaterThan(0);
  });
});
