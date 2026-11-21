/** Adapts trajectory-prediction close approaches into typed events. */
import type { IntegratorId } from '../../types/celestial';
import { findCloseApproach } from '../orbits/closeApproach';
import type { PhysicsWorld } from '../physics/world';
import { createSimulationEvent, nextEventSequence } from './definitions';
import { finiteNumber, finiteOrNull, positiveInt, type CloseApproachEventPayload, type SimulationEvent } from './types';

export interface CloseApproachPair {
  indexA: number;
  indexB: number;
}

export interface CloseApproachAdapterOptions {
  steps?: number;
  dt?: number;
  integrator?: IntegratorId;
  sampleEvery?: number;
  /** Only report approaches at or below this separation. */
  threshold?: number;
  priority?: number;
}

const INTEGRATORS: readonly IntegratorId[] = ['euler', 'semi-implicit-euler', 'velocity-verlet', 'rk4'];

function validIndex(world: PhysicsWorld, index: unknown): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < world.count;
}

/** Reuses `findCloseApproach`, sanitising sampling options and returned values. */
export function createCloseApproachEvents(
  world: PhysicsWorld,
  pairs: readonly CloseApproachPair[],
  options: CloseApproachAdapterOptions = {},
): SimulationEvent<'closeApproach'>[] {
  const dt = finiteNumber(options.dt, 60);
  if (dt <= 0) return [];
  const steps = Math.min(4096, positiveInt(options.steps, 32));
  const sampleEvery = Math.min(steps, positiveInt(options.sampleEvery, 1));
  const integrator: IntegratorId = INTEGRATORS.includes(options.integrator as IntegratorId)
    ? (options.integrator as IntegratorId)
    : 'velocity-verlet';
  const threshold = finiteOrNull(options.threshold);
  const events: SimulationEvent<'closeApproach'>[] = [];

  for (const pair of pairs) {
    if (!pair || !validIndex(world, pair.indexA) || !validIndex(world, pair.indexB)) continue;
    if (pair.indexA === pair.indexB) continue;

    const approach = findCloseApproach(world, pair.indexA, pair.indexB, {
      steps,
      dt,
      integrator,
      sampleEvery,
    });
    if (!approach) continue;
    const distance = finiteOrNull(approach.distance);
    const time = finiteOrNull(approach.time);
    const sampleIndex = finiteOrNull(approach.sampleIndex);
    if (distance === null || time === null || sampleIndex === null) continue;
    if (threshold !== null && distance > Math.max(0, threshold)) continue;

    const payload: CloseApproachEventPayload = {
      id: `closeApproach-${nextEventSequence()}`,
      indexA: pair.indexA,
      indexB: pair.indexB,
      idA: world.ids[pair.indexA] ?? `body-${pair.indexA}`,
      idB: world.ids[pair.indexB] ?? `body-${pair.indexB}`,
      distance,
      time,
      sampleIndex,
      threshold,
    };
    events.push(createSimulationEvent('closeApproach', payload, { time, priority: options.priority }));
  }
  return events;
}

/** Emits accepted close-approach events on any bus-like emitter. */
export function emitCloseApproachEvents(
  bus: { emit(event: SimulationEvent<'closeApproach'>): number },
  world: PhysicsWorld,
  pairs: readonly CloseApproachPair[],
  options: CloseApproachAdapterOptions = {},
): SimulationEvent<'closeApproach'>[] {
  const events = createCloseApproachEvents(world, pairs, options);
  for (const event of events) bus.emit(event);
  return events;
}
