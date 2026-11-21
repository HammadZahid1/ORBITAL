import { computeEnergy, type EnergySnapshot } from './energy';
import type { PhysicsWorld } from '../physics/world';

export interface StabilityReport {
  energy: EnergySnapshot;
  initialEnergy: number;
  absoluteDrift: number;
  relativeDrift: number;
  momentumResidual: number;
}

/** Compares current conservation quantities with a recorded baseline. */
export function analyseStability(world: PhysicsWorld, initialEnergy: number): StabilityReport {
  const energy = computeEnergy(world);
  const absoluteDrift = energy.total - initialEnergy;
  const relativeDrift = Math.abs(initialEnergy) > 1e-30 ? Math.abs(absoluteDrift / initialEnergy) : 0;
  let px = 0;
  let py = 0;
  let pz = 0;
  for (let i = 0; i < world.count; i += 1) {
    px += world.mass[i] * world.vel[i * 3];
    py += world.mass[i] * world.vel[i * 3 + 1];
    pz += world.mass[i] * world.vel[i * 3 + 2];
  }
  return {
    energy,
    initialEnergy,
    absoluteDrift,
    relativeDrift,
    momentumResidual: Math.hypot(px, py, pz),
  };
}

/** Captures the energy baseline for a freshly reset world. */
export function energyBaseline(world: PhysicsWorld): number {
  return computeEnergy(world).total;
}
