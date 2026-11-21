import type { Integrator } from './types';

/**
 * Symplectic Euler (semi-implicit): velocity is advanced before position.
 * It remains first-order accurate but exhibits much better long-term energy
 * behaviour than explicit Euler for orbital motion.
 */
export const semiImplicitEulerIntegrator: Integrator = {
  id: 'semi-implicit-euler',
  label: 'Semi-implicit Euler',
  shortLabel: 'Symplectic',
  description: 'First-order symplectic integrator with bounded energy error for stable orbits.',
  order: 1,
  evaluations: 1,
  step(world, dt, acceleration) {
    acceleration(world);
    const size = world.count * 3;
    for (let i = 0; i < size; i += 1) {
      world.vel[i] += world.acc[i] * dt;
      world.pos[i] += world.vel[i] * dt;
    }
  },
};
