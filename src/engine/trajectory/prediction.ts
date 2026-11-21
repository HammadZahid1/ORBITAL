import type { IntegratorId } from '../../types/celestial';
import type { Vec3 } from '../../types/vector';
import { getIntegrator } from '../integrators';
import { computeAccelerations } from '../physics/gravity';
import type { PhysicsWorld } from '../physics/world';

export interface PredictionOptions {
  steps: number;
  dt: number;
  integrator: IntegratorId;
  sampleEvery?: number;
}

function cloneWorld(world: PhysicsWorld): PhysicsWorld {
  return {
    ...world,
    ids: [...world.ids],
    mass: world.mass.slice(),
    radius: world.radius.slice(),
    pos: world.pos.slice(),
    vel: world.vel.slice(),
    acc: world.acc.slice(),
    accPrev: world.accPrev.slice(),
    lockPos: world.lockPos.slice(),
    lockVel: world.lockVel.slice(),
    locked: world.locked.slice(),
    rk4: {
      p0: world.rk4.p0.slice(),
      v0: world.rk4.v0.slice(),
      a1: world.rk4.a1.slice(),
      a2: world.rk4.a2.slice(),
      a3: world.rk4.a3.slice(),
      a4: world.rk4.a4.slice(),
      v2: world.rk4.v2.slice(),
      v3: world.rk4.v3.slice(),
      v4: world.rk4.v4.slice(),
    },
    collisionMode: 'none',
    collisionsEnabled: false,
    accInitialized: world.accInitialized,
  };
}

/**
 * Propagates a copy of the current world forward in time and samples one
 * body's path. This is a short-term numerical forecast, not an exact analytic
 * Ephemeris: perturbations and solver error accumulate with horizon length.
 */
export function predictTrajectory(
  world: PhysicsWorld,
  index: number,
  options: PredictionOptions,
): Vec3[] {
  if (index < 0 || index >= world.count) return [];
  const steps = Math.max(1, Math.floor(options.steps));
  const sampleEvery = Math.max(1, Math.floor(options.sampleEvery ?? 1));
  const dt = options.dt;
  const copy = cloneWorld(world);
  const integrator = getIntegrator(options.integrator);
  const points: Vec3[] = [
    { x: copy.pos[index * 3], y: copy.pos[index * 3 + 1], z: copy.pos[index * 3 + 2] },
  ];

  for (let step = 0; step < steps; step += 1) {
    integrator.step(copy, dt, computeAccelerations);
    if ((step + 1) % sampleEvery === 0) {
      points.push({
        x: copy.pos[index * 3],
        y: copy.pos[index * 3 + 1],
        z: copy.pos[index * 3 + 2],
      });
    }
  }
  return points;
}
