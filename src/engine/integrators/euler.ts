import type { Integrator } from './types';

/** First-order explicit Euler: xₙ₊₁ = xₙ + vₙΔt, vₙ₊₁ = vₙ + aₙΔt. */
export const eulerIntegrator: Integrator = {
  id: 'euler',
  label: 'Explicit Euler',
  shortLabel: 'Euler',
  description: 'First-order, non-symplectic. Useful for demonstrating numerical energy drift.',
  order: 1,
  evaluations: 1,
  step(world, dt, acceleration) {
    acceleration(world);
    const size = world.count * 3;
    for (let i = 0; i < size; i += 1) {
      world.pos[i] += world.vel[i] * dt;
      world.vel[i] += world.acc[i] * dt;
    }
  },
};
