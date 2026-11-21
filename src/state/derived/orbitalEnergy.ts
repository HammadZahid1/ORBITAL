/** Per-body two-body orbital energies relative to the hierarchical parent. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { findBodyById } from './bodyIndex';
import {
  addFinite,
  buildWorldIndex,
  clampFinite,
  distanceBetween,
  finiteNumber,
  worldIndexMap,
  worldPosition,
  worldPositiveMass,
} from './internal';
import { relativeVelocityToParent } from './relativeVelocity';

export interface OrbitalEnergy {
  id: string;
  parentId: string | null;
  /** Specific orbital energy, J/kg. Negative means formally bound. */
  specificEnergy: number;
  /** ½ m v_rel² in the parent frame, J. */
  kineticEnergy: number;
  /** −μ m / r (softened when the world defines a softening length), J. */
  potentialEnergy: number;
  /** Kinetic plus potential, J. */
  totalEnergy: number;
  bound: boolean;
}

/** Computes the parent-relative two-body energy of one body. */
export function orbitalEnergyForBody(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  id: string,
): OrbitalEnergy | null {
  const body = findBodyById(bodies, id);
  if (!body || typeof body.parentId !== 'string') return null;
  const parent = findBodyById(bodies, body.parentId);
  if (!parent || parent.id === id) return null;

  const relative = relativeVelocityToParent(world, bodies, id);
  if (!relative) return null;
  const worldById = worldIndexMap(world);
  const bodyIndex = worldById.get(id);
  const parentIndex = worldById.get(parent.id);
  if (bodyIndex === undefined || parentIndex === undefined) return null;

  const bodyMass = worldPositiveMass(world, bodyIndex);
  const parentMass = worldPositiveMass(world, parentIndex);
  const bodyPosition = worldPosition(world, bodyIndex);
  const parentPosition = worldPosition(world, parentIndex);
  const gravity = finiteNumber(world.G);
  if (
    bodyMass === null ||
    parentMass === null ||
    !bodyPosition ||
    !parentPosition ||
    gravity === null ||
    gravity <= 0
  ) {
    return null;
  }

  const separation = distanceBetween(bodyPosition, parentPosition);
  const mu = gravity * addFinite(bodyMass, parentMass);
  const softening = finiteNumber(world.softening);
  const soft = softening !== null && softening > 0 ? softening : 0;
  const softenedRadius = finiteNumber(Math.hypot(separation, soft));
  if (separation <= 0 || mu <= 0 || softenedRadius === null || softenedRadius <= 0) return null;

  const speedSquared = relative.x ** 2 + relative.y ** 2 + relative.z ** 2;
  const specific = finiteNumber(0.5 * speedSquared - mu / softenedRadius);
  const kinetic = finiteNumber(0.5 * bodyMass * speedSquared);
  const potential = finiteNumber((-mu * bodyMass) / softenedRadius);
  if (specific === null || kinetic === null || potential === null) return null;
  const total = finiteNumber(kinetic + potential);
  if (total === null) return null;

  return {
    id,
    parentId: parent.id,
    specificEnergy: clampFinite(specific),
    kineticEnergy: clampFinite(kinetic),
    potentialEnergy: clampFinite(potential),
    totalEnergy: clampFinite(total),
    bound: specific < 0,
  };
}

/** Parent-relative energies keyed by unique body ID. */
export function orbitalEnergies(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
): Map<string, OrbitalEnergy> {
  const energies = new Map<string, OrbitalEnergy>();
  const present = buildWorldIndex(world);
  for (const body of bodies) {
    if (!body || energies.has(body.id) || !present.has(body.id)) continue;
    const energy = orbitalEnergyForBody(world, bodies, body.id);
    if (energy) energies.set(body.id, energy);
  }
  return energies;
}

/** Sum of all computable parent-relative total energies. */
export function totalOrbitalEnergy(world: PhysicsWorld, bodies: readonly CelestialBody[]): number {
  let total = 0;
  for (const energy of orbitalEnergies(world, bodies).values()) total = addFinite(total, energy.totalEnergy);
  return total;
}

/** True when the two-body parent-relative energy is finite and negative. */
export function isBoundToParent(world: PhysicsWorld, bodies: readonly CelestialBody[], id: string): boolean {
  return orbitalEnergyForBody(world, bodies, id)?.bound === true;
}
