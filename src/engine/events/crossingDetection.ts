/** Axis-plane crossing detection with interpolated event times. */
import type { PhysicsWorld } from '../physics/world';
import { createSimulationEvent, nextEventSequence } from './definitions';
import {
  finiteOrNull,
  positiveInt,
  type CrossingAxis,
  type CrossingEventPayload,
  type SimulationEvent,
} from './types';

export interface CrossingDetectionOptions {
  axis?: CrossingAxis;
  /** Coordinate of the plane in the inertial frame (or relative to reference). */
  plane?: number;
  /** Ignore motion inside this band around the plane. */
  tolerance?: number;
  /** Measure the crossing relative to another body's coordinate. */
  referenceIndex?: number | null;
  priority?: number;
  capacity?: number;
}

export interface CrossingResult {
  direction: -1 | 1;
  fraction: number;
}

/** Pure signed-plane crossing test; returns null without a true sign change. */
export function detectCrossing(previous: number, current: number, tolerance = 0): CrossingResult | null {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
  const band = Math.max(0, finiteOrNull(tolerance) ?? 0);
  let direction: -1 | 1;
  if (previous <= -band && current > band) direction = 1;
  else if (previous >= band && current < -band) direction = -1;
  else return null;

  const fraction = -previous / (current - previous);
  if (!Number.isFinite(fraction)) return null;
  return { direction, fraction: Math.min(1, Math.max(0, fraction)) };
}

function validIndex(world: PhysicsWorld, index: unknown): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < world.count;
}

interface CrossingSample {
  value: number;
  time: number;
}

/** Tracks one signed coordinate per body and emits events when planes are crossed. */
export class CrossingTracker {
  readonly capacity: number;
  private readonly options: CrossingDetectionOptions;
  private readonly axis: CrossingAxis;
  private readonly previous = new Map<number, CrossingSample>();

  constructor(options: CrossingDetectionOptions = {}) {
    this.options = options;
    this.axis = options.axis === 'x' || options.axis === 'y' || options.axis === 'z' ? options.axis : 'z';
    this.capacity = positiveInt(options.capacity, 256, 100_000);
  }

  get size(): number {
    return this.previous.size;
  }

  reset(index?: number): void {
    if (index === undefined) this.previous.clear();
    else this.previous.delete(index);
  }

  /** Seeds or updates the previous sample without checking for a crossing. */
  observe(world: PhysicsWorld, index: number): void {
    const sample = this.sample(world, index);
    if (sample) this.remember(index, sample);
  }

  /** Compares with the last sample and returns an event when a plane is crossed. */
  update(world: PhysicsWorld, index: number): SimulationEvent<'crossing'> | null {
    const sample = this.sample(world, index);
    if (!sample) {
      this.previous.delete(index);
      return null;
    }
    const last = this.previous.get(index);
    this.remember(index, sample);
    if (!last) return null;

    const crossing = detectCrossing(last.value, sample.value, this.options.tolerance);
    if (!crossing) return null;

    const interpolated = last.time + (sample.time - last.time) * crossing.fraction;
    const time = Number.isFinite(interpolated) ? interpolated : sample.time;
    const referenceIndex = this.options.referenceIndex ?? null;
    const reference =
      referenceIndex !== null && validIndex(world, referenceIndex) ? (world.ids[referenceIndex] ?? null) : null;
    const plane = finiteOrNull(this.options.plane) ?? 0;
    const payload: CrossingEventPayload = {
      id: `crossing-${nextEventSequence()}`,
      index,
      bodyId: world.ids[index] ?? `body-${index}`,
      axis: this.axis,
      plane,
      referenceIndex: referenceIndex !== null && validIndex(world, referenceIndex) ? referenceIndex : null,
      referenceId: reference,
      from: last.value,
      to: sample.value,
      time,
      direction: crossing.direction,
      fraction: crossing.fraction,
    };
    return createSimulationEvent('crossing', payload, { time, priority: this.options.priority });
  }

  private sample(world: PhysicsWorld, index: number): CrossingSample | null {
    if (!validIndex(world, index)) return null;
    const component = this.axis === 'x' ? 0 : this.axis === 'y' ? 1 : 2;
    const coordinate = finiteOrNull(world.pos[index * 3 + component]);
    if (coordinate === null) return null;

    let plane = finiteOrNull(this.options.plane) ?? 0;
    const referenceIndex = this.options.referenceIndex;
    if (referenceIndex !== null && referenceIndex !== undefined && validIndex(world, referenceIndex) && referenceIndex !== index) {
      const referenceCoordinate = finiteOrNull(world.pos[referenceIndex * 3 + component]);
      if (referenceCoordinate === null) return null;
      plane += referenceCoordinate;
    }
    const value = coordinate - plane;
    if (!Number.isFinite(value)) return null;
    return { value, time: finiteOrNull(world.time) ?? 0 };
  }

  private remember(index: number, sample: CrossingSample): void {
    if (!this.previous.has(index) && this.previous.size >= this.capacity) {
      const oldest = this.previous.keys().next();
      if (!oldest.done) this.previous.delete(oldest.value);
    }
    this.previous.set(index, sample);
  }
}
