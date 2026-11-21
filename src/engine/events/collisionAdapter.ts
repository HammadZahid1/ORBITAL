/** Adapts engine collision records into typed simulation events. */
import type { CollisionMode } from '../../types/celestial';
import { detectCollisions } from '../collision/collision';
import type { PhysicsWorld } from '../physics/world';
import { createSimulationEvent } from './definitions';
import { finiteNumber, finiteOrNull, type CollisionEventPayload, type SimulationEvent } from './types';

export interface CollisionAdapterOptions {
  /** Ignore overlaps slower than this value. */
  minRelativeSpeed?: number;
  /** Ignore overlaps farther than this centre distance. */
  maxDistance?: number;
  priority?: number;
}

/** Adapts `detectCollisions` output without duplicating geometry or response logic. */
export function createCollisionEvents(
  world: PhysicsWorld,
  options: CollisionAdapterOptions = {},
): SimulationEvent<'collision'>[] {
  const minSpeed = finiteOrNull(options.minRelativeSpeed);
  const maxDistance = finiteOrNull(options.maxDistance);
  const events: SimulationEvent<'collision'>[] = [];

  for (const collision of detectCollisions(world)) {
    const time = finiteOrNull(collision.time);
    if (time === null) continue;
    if (minSpeed !== null && collision.relativeSpeed < Math.max(0, minSpeed)) continue;
    if (maxDistance !== null && collision.distance > Math.max(0, maxDistance)) continue;

    const absorbedIndex = finiteOrNull(collision.absorbedIndex);
    if (collision.absorbedIndex !== null && absorbedIndex === null) continue;
    const response: CollisionMode = collision.response;
    const payload: CollisionEventPayload = {
      id: collision.id,
      indexA: collision.indexA,
      indexB: collision.indexB,
      idA: collision.idA,
      idB: collision.idB,
      time,
      distance: collision.distance,
      relativeSpeed: collision.relativeSpeed,
      penetration: collision.penetration,
      response,
      absorbedIndex,
    };
    if (![payload.distance, payload.relativeSpeed, payload.penetration].every(Number.isFinite)) continue;
    events.push(createSimulationEvent('collision', payload, { time, priority: options.priority }));
  }
  return events;
}

/** Convenience adapter that emits every accepted collision event on a bus. */
export function emitCollisionEvents(
  bus: { emit(event: SimulationEvent<'collision'>): number },
  world: PhysicsWorld,
  options: CollisionAdapterOptions = {},
): SimulationEvent<'collision'>[] {
  const events = createCollisionEvents(world, options);
  for (const event of events) bus.emit(event);
  return events;
}

/** Keeps generator helpers from silently drifting when callers pass odd values. */
export function normalizeCollisionThreshold(value: unknown, fallback = 0): number {
  return Math.max(0, finiteNumber(value, fallback));
}
