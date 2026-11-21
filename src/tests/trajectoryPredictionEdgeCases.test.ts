import { describe, expect, it } from 'vitest';
import { G } from '../engine/numeric';
import { getIntegrator } from '../engine/integrators';
import { computeAccelerations } from '../engine/physics/gravity';
import { createPhysicsWorld, readVec3, writeVec3 } from '../engine/physics/world';
import { predictTrajectory } from '../engine/trajectory/prediction';
import type { IntegratorId } from '../types/celestial';

const MASS = 5.9722e24;
const SEPARATION = 3.844e8;
const RADIUS = SEPARATION / 2;
const SPEED = Math.sqrt((G * MASS) / (2 * SEPARATION));
const OMEGA = SPEED / RADIUS;
const PERIOD = (2 * Math.PI) / OMEGA;

function binaryWorld() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.G = G;
  world.softening = 0;
  world.ids.push('primary', 'secondary');
  world.mass[0] = MASS;
  world.mass[1] = MASS;
  writeVec3(world.pos, 0, { x: -RADIUS, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: RADIUS, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 0, y: 0, z: -SPEED });
  writeVec3(world.vel, 1, { x: 0, y: 0, z: SPEED });
  computeAccelerations(world);
  world.accPrev.set(world.acc.subarray(0, world.count * 3), 0);
  world.accInitialized = true;
  return world;
}

function analyticError(point: { x: number; y: number; z: number }, time: number): number {
  return (
    Math.hypot(
      point.x - RADIUS * Math.cos(OMEGA * time),
      point.y,
      point.z - RADIUS * Math.sin(OMEGA * time),
    ) / SEPARATION
  );
}

function referencePosition(stepCount: number, dt: number, id: IntegratorId = 'velocity-verlet') {
  const world = binaryWorld();
  const integrator = getIntegrator(id);
  for (let i = 0; i < stepCount; i += 1) integrator.step(world, dt, computeAccelerations);
  return readVec3(world.pos, 1);
}

describe('trajectory prediction edge cases', () => {
  it('returns no path for an index outside the world', () => {
    const world = binaryWorld();
    expect(predictTrajectory(world, -1, { steps: 10, dt: 100, integrator: 'velocity-verlet' })).toEqual([]);
    expect(predictTrajectory(world, 2, { steps: 10, dt: 100, integrator: 'velocity-verlet' })).toEqual([]);
  });

  it('clamps sample counts and samples exactly on the requested step boundaries', () => {
    const world = binaryWorld();
    const dt = PERIOD / 200;
    const single = predictTrajectory(world, 1, {
      steps: 0,
      dt,
      integrator: 'velocity-verlet',
      sampleEvery: 0,
    });
    expect(single).toHaveLength(2);
    expect(single[1]).toEqual(referencePosition(1, dt));

    const sparse = predictTrajectory(world, 1, {
      steps: 10,
      dt,
      integrator: 'velocity-verlet',
      sampleEvery: 7,
    });
    expect(sparse).toHaveLength(2);
    expect(sparse[1]).toEqual(referencePosition(7, dt));
    expect(sparse[1]).not.toEqual(referencePosition(10, dt));
  });

  it('retraces a circular orbit when propagated backwards with a reversible integrator', () => {
    const forwardDt = PERIOD / 200;
    const world = binaryWorld();
    const start = readVec3(world.pos, 1);
    const forward = predictTrajectory(world, 1, {
      steps: 200,
      dt: forwardDt,
      integrator: 'velocity-verlet',
    });
    expect(analyticError(forward.at(-1)!, PERIOD)).toBeLessThan(1e-2);

    const integrator = getIntegrator('velocity-verlet');
    for (let i = 0; i < 200; i += 1) integrator.step(world, forwardDt, computeAccelerations);
    for (let i = 0; i < 200; i += 1) integrator.step(world, -forwardDt, computeAccelerations);
    const returned = readVec3(world.pos, 1);
    expect(
      Math.hypot(returned.x - start.x, returned.y - start.y, returned.z - start.z) / SEPARATION,
    ).toBeLessThan(1e-10);
  });

  it('converges towards the analytic orbit as the forecast step is refined', () => {
    const coarseDt = PERIOD / 100;
    const fineDt = PERIOD / 200;
    const coarseRk4 = predictTrajectory(binaryWorld(), 1, {
      steps: 100,
      dt: coarseDt,
      integrator: 'rk4',
    });
    const fineRk4 = predictTrajectory(binaryWorld(), 1, {
      steps: 200,
      dt: fineDt,
      integrator: 'rk4',
    });
    const coarseVerlet = predictTrajectory(binaryWorld(), 1, {
      steps: 100,
      dt: coarseDt,
      integrator: 'velocity-verlet',
    });
    const fineVerlet = predictTrajectory(binaryWorld(), 1, {
      steps: 200,
      dt: fineDt,
      integrator: 'velocity-verlet',
    });

    const coarseRk4Error = analyticError(coarseRk4.at(-1)!, PERIOD);
    const fineRk4Error = analyticError(fineRk4.at(-1)!, PERIOD);
    const coarseVerletError = analyticError(coarseVerlet.at(-1)!, PERIOD);
    const fineVerletError = analyticError(fineVerlet.at(-1)!, PERIOD);

    expect(fineRk4Error).toBeLessThan(coarseRk4Error / 4);
    expect(fineRk4Error).toBeLessThan(1e-6);
    expect(fineVerletError).toBeLessThan(coarseVerletError / 2);
    expect(fineVerletError).toBeLessThan(1e-2);
  });
});
