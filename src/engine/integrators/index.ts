import type { IntegratorId } from '../../types/celestial';
import { eulerIntegrator } from './euler';
import { rk4Integrator } from './rk4';
import { semiImplicitEulerIntegrator } from './semiImplicitEuler';
import { velocityVerletIntegrator } from './velocityVerlet';
import type { Integrator } from './types';

export const INTEGRATORS: Record<IntegratorId, Integrator> = {
  euler: eulerIntegrator,
  'semi-implicit-euler': semiImplicitEulerIntegrator,
  'velocity-verlet': velocityVerletIntegrator,
  rk4: rk4Integrator,
};

export const INTEGRATOR_LIST: Integrator[] = [
  velocityVerletIntegrator,
  semiImplicitEulerIntegrator,
  rk4Integrator,
  eulerIntegrator,
];

export function getIntegrator(id: IntegratorId): Integrator {
  return INTEGRATORS[id] ?? velocityVerletIntegrator;
}

export function isIntegratorId(value: unknown): value is IntegratorId {
  return typeof value === 'string' && value in INTEGRATORS;
}

export type { Integrator, AccelerationFunction } from './types';
export { eulerIntegrator } from './euler';
export { semiImplicitEulerIntegrator } from './semiImplicitEuler';
export { velocityVerletIntegrator } from './velocityVerlet';
export { rk4Integrator } from './rk4';
