import type { Vec3 } from '../../types/vector';
import type { PhysicsWorld } from './world';

/** Minimum separation used when the softening length is configured as zero. */
const MINIMUM_SOFTENING = 1e-6;

/**
 * Magnitude of the Newtonian attraction between two point masses.
 *
 * F = G · m₁ · m₂ / r²
 *
 * Softening replaces r² with r² + ε² to keep the force finite as r → 0.
 * This is a deliberate numerical regularisation, not a physical model of
 * finite-size bodies.
 */
export function gravitationalForce(
  massA: number,
  massB: number,
  distance: number,
  G: number,
  softening = 0,
): number {
  if (massA <= 0 || massB <= 0 || !Number.isFinite(distance)) return 0;
  const epsilon = Math.max(softening, MINIMUM_SOFTENING);
  const rSquared = distance * distance + epsilon * epsilon;
  return (G * massA * massB) / rSquared;
}

/**
 * Acceleration of body A caused by body B (metres per second squared).
 * Acceleration is independent of A's own mass, as required by the equivalence
 * principle.
 */
export function gravitationalAcceleration(
  massB: number,
  distance: number,
  G: number,
  softening = 0,
): number {
  if (massB <= 0 || !Number.isFinite(distance)) return 0;
  const epsilon = Math.max(softening, MINIMUM_SOFTENING);
  const rSquared = distance * distance + epsilon * epsilon;
  // The vector coefficient is G·M/(r²+ε²)^{3/2}; multiply by separation to
  // obtain the acceleration magnitude along the separation direction.
  return (G * massB * Math.max(distance, 0)) / (rSquared * Math.sqrt(rSquared));
}

/**
 * Computes the acceleration acting on one body from every other body in the
 * world. Returns a newly allocated vector; use `computeAccelerations` inside
 * simulation loops to avoid allocations.
 */
export function accelerationAt(world: PhysicsWorld, index: number): Vec3 {
  let ax = 0;
  let ay = 0;
  let az = 0;
  const px = world.pos[index * 3];
  const py = world.pos[index * 3 + 1];
  const pz = world.pos[index * 3 + 2];
  const epsilonSquared = Math.max(world.softening, MINIMUM_SOFTENING) ** 2;

  for (let j = 0; j < world.count; j += 1) {
    if (j === index || world.mass[j] <= 0) continue;
    const dx = world.pos[j * 3] - px;
    const dy = world.pos[j * 3 + 1] - py;
    const dz = world.pos[j * 3 + 2] - pz;
    const rSquared = dx * dx + dy * dy + dz * dz + epsilonSquared;
    const factor = (world.G * world.mass[j]) / (rSquared * Math.sqrt(rSquared));
    ax += dx * factor;
    ay += dy * factor;
    az += dz * factor;
  }
  return { x: ax, y: ay, z: az };
}

/**
 * Fills `world.acc` with pairwise gravitational accelerations.
 *
 * Complexity: O(N²) with N(N−1)/2 symmetric pair evaluations. Each pair is
 * evaluated once and applied with equal-and-opposite momentum change, so the
 * discrete solver conserves linear momentum to floating-point precision.
 */
export function computeAccelerations(world: PhysicsWorld): void {
  world.acc.fill(0, 0, world.count * 3);
  const epsilonSquared = Math.max(world.softening, MINIMUM_SOFTENING) ** 2;

  for (let i = 0; i < world.count; i += 1) {
    const mi = world.mass[i];
    if (mi <= 0) continue;
    const ix = i * 3;
    for (let j = i + 1; j < world.count; j += 1) {
      const mj = world.mass[j];
      if (mj <= 0) continue;
      const jx = j * 3;
      const dx = world.pos[jx] - world.pos[ix];
      const dy = world.pos[jx + 1] - world.pos[ix + 1];
      const dz = world.pos[jx + 2] - world.pos[ix + 2];
      const rSquared = dx * dx + dy * dy + dz * dz + epsilonSquared;
      const inverseR = 1 / Math.sqrt(rSquared);
      const factor = world.G * inverseR * inverseR * inverseR;
      const ai = factor * mj;
      const aj = factor * mi;
      world.acc[ix] += dx * ai;
      world.acc[ix + 1] += dy * ai;
      world.acc[ix + 2] += dz * ai;
      world.acc[jx] -= dx * aj;
      world.acc[jx + 1] -= dy * aj;
      world.acc[jx + 2] -= dz * aj;
    }
  }
}

/** Acceleration at an arbitrary point, useful for gravitational field maps. */
export function fieldAcceleration(
  world: PhysicsWorld,
  x: number,
  y: number,
  z: number,
): Vec3 {
  let ax = 0;
  let ay = 0;
  let az = 0;
  const epsilonSquared = Math.max(world.softening, MINIMUM_SOFTENING) ** 2;
  for (let i = 0; i < world.count; i += 1) {
    const mass = world.mass[i];
    if (mass <= 0) continue;
    const dx = world.pos[i * 3] - x;
    const dy = world.pos[i * 3 + 1] - y;
    const dz = world.pos[i * 3 + 2] - z;
    const rSquared = dx * dx + dy * dy + dz * dz + epsilonSquared;
    const factor = (world.G * mass) / (rSquared * Math.sqrt(rSquared));
    ax += dx * factor;
    ay += dy * factor;
    az += dz * factor;
  }
  return { x: ax, y: ay, z: az };
}
