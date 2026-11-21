/** Transition-based orbital capture detection around a dominant primary. */
import type { PhysicsWorld } from '../physics/world';
import { createSimulationEvent, nextEventSequence } from './definitions';
import { assessEscape, dominantBodyIndex } from './escapeDetection';
import { finiteOrNull, positiveInt, type CaptureEventPayload, type SimulationEvent } from './types';

export interface CaptureDetectionOptions {
  /** Only capture inside this primary-relative separation. */
  maxDistance?: number;
  /** Require inward radial speed strictly greater than this value. */
  minInwardSpeed?: number;
  /** Negative specific energy must be below `-energyMargin`. */
  energyMargin?: number;
  /** Maximum number of tracked body/primary pairs. */
  capacity?: number;
  priority?: number;
}

export interface CaptureAssessment {
  index: number;
  primaryIndex: number;
  bodyId: string;
  primaryId: string;
  time: number;
  distance: number;
  speed: number;
  radialSpeed: number;
  specificEnergy: number;
  bound: boolean;
}

/** Bound-and-incoming assessment; escape geometry is shared with `assessEscape`. */
export function assessCapture(
  world: PhysicsWorld,
  index: number,
  primaryIndex: number,
  options: CaptureDetectionOptions = {},
): CaptureAssessment | null {
  const base = assessEscape(world, index, primaryIndex, {
    energyMargin: options.energyMargin,
    minDistance: 0,
    outwardOnly: false,
  });
  if (!base) return null;

  const margin = finiteOrNull(options.energyMargin) ?? 0;
  const minInward = Math.max(0, finiteOrNull(options.minInwardSpeed) ?? 0);
  const maxDistance = finiteOrNull(options.maxDistance);
  const bound =
    base.specificEnergy < -margin &&
    base.radialSpeed < -minInward &&
    (maxDistance === null || base.distance <= Math.max(0, maxDistance));

  return {
    index,
    primaryIndex,
    bodyId: base.bodyId,
    primaryId: base.primaryId,
    time: base.time,
    distance: base.distance,
    speed: base.speed,
    radialSpeed: base.radialSpeed,
    specificEnergy: base.specificEnergy,
    bound,
  };
}

function pairKey(index: number, primaryIndex: number): string {
  return `${primaryIndex}:${index}`;
}

/** Remembers bound/unbound state and emits only on an unbound-to-bound transition. */
export class CaptureTracker {
  readonly capacity: number;
  private readonly options: CaptureDetectionOptions;
  private readonly states = new Map<string, boolean>();

  constructor(options: CaptureDetectionOptions = {}) {
    this.options = options;
    this.capacity = positiveInt(options.capacity, 256, 100_000);
  }

  get size(): number {
    return this.states.size;
  }

  reset(): void {
    this.states.clear();
  }

  /** Records the current state without emitting; returns whether it is bound. */
  observe(world: PhysicsWorld, index: number, primaryIndex: number): boolean {
    const assessment = assessCapture(world, index, primaryIndex, this.options);
    if (!assessment) {
      this.states.delete(pairKey(index, primaryIndex));
      return false;
    }
    this.remember(pairKey(index, primaryIndex), assessment.bound);
    return assessment.bound;
  }

  /** Emits a capture event on the first sample where a previously unbound body binds. */
  update(world: PhysicsWorld, index: number, primaryIndex: number): SimulationEvent<'capture'> | null {
    const assessment = assessCapture(world, index, primaryIndex, this.options);
    if (!assessment) {
      this.states.delete(pairKey(index, primaryIndex));
      return null;
    }
    const key = pairKey(index, primaryIndex);
    const previous = this.states.get(key);
    this.remember(key, assessment.bound);
    if (previous !== false || !assessment.bound) return null;

    const payload: CaptureEventPayload = {
      id: `capture-${nextEventSequence()}`,
      index: assessment.index,
      primaryIndex: assessment.primaryIndex,
      bodyId: assessment.bodyId,
      primaryId: assessment.primaryId,
      time: assessment.time,
      distance: assessment.distance,
      speed: assessment.speed,
      radialSpeed: assessment.radialSpeed,
      specificEnergy: assessment.specificEnergy,
      margin: finiteOrNull(this.options.energyMargin) ?? 0,
    };
    return createSimulationEvent('capture', payload, { time: assessment.time, priority: this.options.priority });
  }

  /** Runs `update` for every body around the chosen (or dominant) primary. */
  trackAll(world: PhysicsWorld, primaryIndex?: number): SimulationEvent<'capture'>[] {
    let primary: number | null | undefined = primaryIndex;
    if (!Number.isInteger(primary) || (primary as number) < 0 || (primary as number) >= world.count) {
      primary = dominantBodyIndex(world);
    }
    if (primary === null || primary === undefined) return [];

    const events: SimulationEvent<'capture'>[] = [];
    for (let i = 0; i < world.count; i += 1) {
      if (i === primary) continue;
      const event = this.update(world, i, primary);
      if (event) events.push(event);
    }
    return events;
  }

  private remember(key: string, bound: boolean): void {
    if (!this.states.has(key) && this.states.size >= this.capacity) {
      const oldest = this.states.keys().next();
      if (!oldest.done) this.states.delete(oldest.value);
    }
    this.states.set(key, bound);
  }
}
