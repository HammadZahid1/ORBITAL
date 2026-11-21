import type { Integrator } from './types';

/**
 * Velocity Verlet, a second-order symplectic integrator:
 *   xₙ₊₁ = xₙ + vₙΔt + ½aₙΔt²
 *   vₙ₊₁ = vₙ + ½(aₙ + aₙ₊₁)Δt
 *
 * Requires one force evaluation per step when the previous acceleration is
 * retained between calls. The solver keeps it in `world.accPrev`.
 */
export const velocityVerletIntegrator: Integrator = {
  id: 'velocity-verlet',
  label: 'Velocity Verlet',
  shortLabel: 'Verlet',
  description: 'Second-order symplectic integrator. Recommended default for orbital simulations.',
  order: 2,
  evaluations: 1,
  step(world, dt, acceleration) {
    const size = world.count * 3;
    // On the first call the acceleration has not yet been evaluated.
    if (!world.accInitialized) {
      acceleration(world);
      world.accPrev.set(world.acc.subarray(0, size), 0);
      world.accInitialized = true;
    } else {
      world.accPrev.set(world.acc.subarray(0, size), 0);
    }

    const halfDtSquared = 0.5 * dt * dt;
    for (let i = 0; i < size; i += 1) {
      world.pos[i] += world.vel[i] * dt + world.accPrev[i] * halfDtSquared;
      world.vel[i] += world.accPrev[i] * dt * 0.5;
    }

    acceleration(world);
    const halfDt = 0.5 * dt;
    for (let i = 0; i < size; i += 1) {
      world.vel[i] += world.acc[i] * halfDt;
      world.accPrev[i] = world.acc[i];
    }
    world.accInitialized = true;
  },
};
