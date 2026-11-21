import type { IntegratorId } from '../../types/celestial';
import type { PhysicsWorld } from '../physics/world';

export type AccelerationFunction = (world: PhysicsWorld) => void;

export interface Integrator {
  id: IntegratorId;
  label: string;
  shortLabel: string;
  description: string;
  /** Formal order of accuracy for smooth forces. */
  order: number;
  /** Number of force evaluations per step. */
  evaluations: number;
  step(world: PhysicsWorld, dt: number, acceleration: AccelerationFunction): void;
}
