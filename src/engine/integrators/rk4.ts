import type { Integrator } from './types';

/**
 * Classical fourth-order Runge–Kutta applied to the first-order system
 * y = (x, v), dy/dt = (v, a(x)). Four force evaluations per step.
 *
 * RK4 is highly accurate for short intervals but is not symplectic, so it can
 * accumulate secular energy drift during very long orbital integrations.
 */
export const rk4Integrator: Integrator = {
  id: 'rk4',
  label: 'Runge–Kutta 4',
  shortLabel: 'RK4',
  description: 'Fourth-order non-symplectic integrator. High short-term accuracy, four force evaluations.',
  order: 4,
  evaluations: 4,
  step(world, dt, acceleration) {
    const size = world.count * 3;
    const { p0, v0, a1, a2, a3, a4, v2, v3, v4 } = world.rk4;

    p0.set(world.pos.subarray(0, size), 0);
    v0.set(world.vel.subarray(0, size), 0);

    acceleration(world);
    a1.set(world.acc.subarray(0, size), 0);

    const half = dt * 0.5;
    for (let i = 0; i < size; i += 1) {
      world.pos[i] = p0[i] + v0[i] * half;
      world.vel[i] = v0[i] + a1[i] * half;
    }
    acceleration(world);
    a2.set(world.acc.subarray(0, size), 0);
    v2.set(world.vel.subarray(0, size), 0);

    for (let i = 0; i < size; i += 1) {
      world.pos[i] = p0[i] + v2[i] * half;
      world.vel[i] = v0[i] + a2[i] * half;
    }
    acceleration(world);
    a3.set(world.acc.subarray(0, size), 0);
    v3.set(world.vel.subarray(0, size), 0);

    for (let i = 0; i < size; i += 1) {
      world.pos[i] = p0[i] + v3[i] * dt;
      world.vel[i] = v0[i] + a3[i] * dt;
    }
    acceleration(world);
    a4.set(world.acc.subarray(0, size), 0);
    v4.set(world.vel.subarray(0, size), 0);

    const sixth = dt / 6;
    for (let i = 0; i < size; i += 1) {
      world.pos[i] = p0[i] + sixth * (v0[i] + 2 * v2[i] + 2 * v3[i] + v4[i]);
      world.vel[i] = v0[i] + sixth * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]);
    }

    // Leave the world with the acceleration at the new state.
    acceleration(world);
  },
};
