import type { Vec3 } from '../../types/vector';
import { cross3 } from '../vector';
import type { PhysicsWorld } from '../physics/world';

export interface EnergySnapshot {
  /** Total kinetic energy, joules. */
  kinetic: number;
  /** Total gravitational potential energy, joules. */
  potential: number;
  /** Kinetic plus potential, joules. */
  total: number;
  /** Net angular momentum about the world origin, kg·m²/s. */
  angularMomentum: Vec3;
  angularMomentumMagnitude: number;
  /** Total linear momentum, kg·m/s. */
  linearMomentum: Vec3;
}

/** Sum of ½mv² over all bodies. */
export function kineticEnergy(world: PhysicsWorld): number {
  let energy = 0;
  for (let i = 0; i < world.count; i += 1) {
    const mass = world.mass[i];
    if (mass <= 0) continue;
    const vx = world.vel[i * 3];
    const vy = world.vel[i * 3 + 1];
    const vz = world.vel[i * 3 + 2];
    energy += 0.5 * mass * (vx * vx + vy * vy + vz * vz);
  }
  return energy;
}

/** Sum of −Gm₁m₂/r over all unique pairs. Uses the configured softening length. */
export function potentialEnergy(world: PhysicsWorld): number {
  let energy = 0;
  const epsilonSquared = Math.max(world.softening, 1e-6) ** 2;
  for (let i = 0; i < world.count; i += 1) {
    if (world.mass[i] <= 0) continue;
    for (let j = i + 1; j < world.count; j += 1) {
      if (world.mass[j] <= 0) continue;
      const dx = world.pos[j * 3] - world.pos[i * 3];
      const dy = world.pos[j * 3 + 1] - world.pos[i * 3 + 1];
      const dz = world.pos[j * 3 + 2] - world.pos[i * 3 + 2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz + epsilonSquared);
      energy -= (world.G * world.mass[i] * world.mass[j]) / r;
    }
  }
  return energy;
}

/** Net orbital angular momentum about the origin: Σ r × mv. */
export function totalAngularMomentum(world: PhysicsWorld): Vec3 {
  let lx = 0;
  let ly = 0;
  let lz = 0;
  for (let i = 0; i < world.count; i += 1) {
    const mass = world.mass[i];
    if (mass <= 0) continue;
    const x = world.pos[i * 3];
    const y = world.pos[i * 3 + 1];
    const z = world.pos[i * 3 + 2];
    const vx = world.vel[i * 3] * mass;
    const vy = world.vel[i * 3 + 1] * mass;
    const vz = world.vel[i * 3 + 2] * mass;
    lx += y * vz - z * vy;
    ly += z * vx - x * vz;
    lz += x * vy - y * vx;
  }
  return { x: lx, y: ly, z: lz };
}

/** Net linear momentum: Σ mv. */
export function totalLinearMomentum(world: PhysicsWorld): Vec3 {
  let px = 0;
  let py = 0;
  let pz = 0;
  for (let i = 0; i < world.count; i += 1) {
    const mass = world.mass[i];
    if (mass <= 0) continue;
    px += mass * world.vel[i * 3];
    py += mass * world.vel[i * 3 + 1];
    pz += mass * world.vel[i * 3 + 2];
  }
  return { x: px, y: py, z: pz };
}

/** Angular momentum of one body relative to another. */
export function relativeAngularMomentum(world: PhysicsWorld, i: number, j: number): Vec3 {
  const rx = world.pos[i * 3] - world.pos[j * 3];
  const ry = world.pos[i * 3 + 1] - world.pos[j * 3 + 1];
  const rz = world.pos[i * 3 + 2] - world.pos[j * 3 + 2];
  const reducedMass =
    (world.mass[i] * world.mass[j]) / Math.max(world.mass[i] + world.mass[j], 1e-30);
  const vx = world.vel[i * 3] - world.vel[j * 3];
  const vy = world.vel[i * 3 + 1] - world.vel[j * 3 + 1];
  const vz = world.vel[i * 3 + 2] - world.vel[j * 3 + 2];
  return cross3({ x: rx, y: ry, z: rz }, { x: vx * reducedMass, y: vy * reducedMass, z: vz * reducedMass });
}

export function computeEnergy(world: PhysicsWorld): EnergySnapshot {
  const kinetic = kineticEnergy(world);
  const potential = potentialEnergy(world);
  const angularMomentum = totalAngularMomentum(world);
  return {
    kinetic,
    potential,
    total: kinetic + potential,
    angularMomentum,
    angularMomentumMagnitude: Math.hypot(angularMomentum.x, angularMomentum.y, angularMomentum.z),
    linearMomentum: totalLinearMomentum(world),
  };
}

/** Relative energy drift against an initial reference, as a dimensionless fraction. */
export function energyDrift(current: number, initial: number): number {
  if (initial === 0 || !Number.isFinite(initial)) return 0;
  return (current - initial) / Math.abs(initial);
}
