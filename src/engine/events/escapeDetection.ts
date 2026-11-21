/** Two-body specific-energy escape detection, finite-safe by construction. */
import type { PhysicsWorld } from '../physics/world';
import { createSimulationEvent, nextEventSequence } from './definitions';
import { finiteOrNull, type EscapeEventPayload, type SimulationEvent } from './types';

export interface EscapeAssessment {
  index: number;
  primaryIndex: number;
  bodyId: string;
  primaryId: string;
  time: number;
  distance: number;
  speed: number;
  radialSpeed: number;
  escapeSpeed: number;
  specificEnergy: number;
  escaped: boolean;
}

export interface EscapeDetectionOptions {
  /** Minimum separation before escape is reported (metres). */
  minDistance?: number;
  /** Specific-energy threshold; zero is the classical parabolic boundary. */
  energyMargin?: number;
  /** Require positive radial velocity in addition to positive energy. */
  outwardOnly?: boolean;
  /** Primary index for batch detection; defaults to the most massive body. */
  primaryIndex?: number;
}

function validIndex(world: PhysicsWorld, index: unknown): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < world.count;
}

function positiveMass(world: PhysicsWorld, index: number): number | null {
  const mass = finiteOrNull(world.mass[index]);
  return mass !== null && mass > 0 ? mass : null;
}

/** Index of the most massive finite-mass body, or null for an empty/invalid world. */
export function dominantBodyIndex(world: PhysicsWorld): number | null {
  let best: number | null = null;
  let bestMass = 0;
  for (let i = 0; i < world.count; i += 1) {
    const mass = positiveMass(world, i);
    if (mass !== null && mass > bestMass) {
      best = i;
      bestMass = mass;
    }
  }
  return best;
}

/** Computes the relative two-body energy state of one body around a primary. */
export function assessEscape(
  world: PhysicsWorld,
  index: number,
  primaryIndex: number,
  options: EscapeDetectionOptions = {},
): EscapeAssessment | null {
  if (!validIndex(world, index) || !validIndex(world, primaryIndex) || index === primaryIndex) return null;
  const mass = positiveMass(world, index);
  const primaryMass = positiveMass(world, primaryIndex);
  const gravity = finiteOrNull(world.G);
  if (mass === null || primaryMass === null || gravity === null || gravity <= 0) return null;

  const base = index * 3;
  const primaryBase = primaryIndex * 3;
  const dx = finiteOrNull(world.pos[base] - world.pos[primaryBase]);
  const dy = finiteOrNull(world.pos[base + 1] - world.pos[primaryBase + 1]);
  const dz = finiteOrNull(world.pos[base + 2] - world.pos[primaryBase + 2]);
  const rvx = finiteOrNull(world.vel[base] - world.vel[primaryBase]);
  const rvy = finiteOrNull(world.vel[base + 1] - world.vel[primaryBase + 1]);
  const rvz = finiteOrNull(world.vel[base + 2] - world.vel[primaryBase + 2]);
  if (dx === null || dy === null || dz === null || rvx === null || rvy === null || rvz === null) return null;

  const distance = Math.hypot(dx, dy, dz);
  const speed = Math.hypot(rvx, rvy, rvz);
  const mu = gravity * (mass + primaryMass);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(speed) || !Number.isFinite(mu)) return null;

  const escapeSpeed = Math.sqrt((2 * mu) / distance);
  const specificEnergy = 0.5 * speed * speed - mu / distance;
  const radialSpeed = (rvx * dx + rvy * dy + rvz * dz) / distance;
  if (![escapeSpeed, specificEnergy, radialSpeed].every(Number.isFinite)) return null;

  const minDistance = Math.max(0, finiteOrNull(options.minDistance) ?? 0);
  const margin = finiteOrNull(options.energyMargin) ?? 0;
  const escaped =
    distance >= minDistance &&
    specificEnergy >= margin &&
    (options.outwardOnly === false || radialSpeed > 0);

  return {
    index,
    primaryIndex,
    bodyId: world.ids[index] ?? `body-${index}`,
    primaryId: world.ids[primaryIndex] ?? `body-${primaryIndex}`,
    time: finiteOrNull(world.time) ?? 0,
    distance,
    speed,
    radialSpeed,
    escapeSpeed,
    specificEnergy,
    escaped,
  };
}

/** Assesses every non-primary body, optionally against a chosen primary. */
export function detectEscapes(world: PhysicsWorld, options: EscapeDetectionOptions = {}): EscapeAssessment[] {
  if (world.count < 2) return [];
  let primary: number | null | undefined = options.primaryIndex;
  if (!validIndex(world, primary)) primary = dominantBodyIndex(world);
  if (primary === null) return [];

  const results: EscapeAssessment[] = [];
  for (let i = 0; i < world.count; i += 1) {
    if (i === primary) continue;
    const assessment = assessEscape(world, i, primary, { ...options, primaryIndex: primary });
    if (assessment?.escaped) results.push(assessment);
  }
  return results;
}

export function createEscapeEvents(
  world: PhysicsWorld,
  options: EscapeDetectionOptions & { priority?: number } = {},
): SimulationEvent<'escape'>[] {
  return detectEscapes(world, options).map((assessment) => {
    const margin = finiteOrNull(options.energyMargin) ?? 0;
    const payload: EscapeEventPayload = {
      id: `escape-${nextEventSequence()}`,
      index: assessment.index,
      primaryIndex: assessment.primaryIndex,
      bodyId: assessment.bodyId,
      primaryId: assessment.primaryId,
      time: assessment.time,
      distance: assessment.distance,
      speed: assessment.speed,
      radialSpeed: assessment.radialSpeed,
      escapeSpeed: assessment.escapeSpeed,
      specificEnergy: assessment.specificEnergy,
      margin,
    };
    return createSimulationEvent('escape', payload, { time: assessment.time, priority: options.priority });
  });
}

export function emitEscapeEvents(
  bus: { emit(event: SimulationEvent<'escape'>): number },
  world: PhysicsWorld,
  options: EscapeDetectionOptions & { priority?: number } = {},
): SimulationEvent<'escape'>[] {
  const events = createEscapeEvents(world, options);
  for (const event of events) bus.emit(event);
  return events;
}
