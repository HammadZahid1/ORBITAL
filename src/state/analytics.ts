import { computeEnergy } from '../engine/energy/energy';
import { calculateOrbitalElements } from '../engine/orbits/orbital';
import { bodyIndex } from '../engine/physics/world';
import type { SimulationEngine } from '../engine/simulation/engine';
import { length3 } from '../engine/vector';

export interface AnalyticsSample {
  time: number;
  kinetic: number;
  potential: number;
  total: number;
  angularMomentum: number;
  linearMomentum: number;
  distance: number;
  speed: number;
  radius: number;
  eccentricity: number;
  bodyCount: number;
  fps: number;
}

export type MetricId = keyof Omit<AnalyticsSample, 'time'>;

/** Collects a bounded time series of physical diagnostics from the live engine. */
export class AnalyticsRecorder {
  samples: AnalyticsSample[] = [];
  maxSamples = 600;
  sampleInterval = 0;
  private lastSampleTime = Number.NEGATIVE_INFINITY;

  reset(): void {
    this.samples = [];
    this.lastSampleTime = Number.NEGATIVE_INFINITY;
  }

  sample(engine: SimulationEngine, selectedId: string | null, fps = 60, force = false): void {
    const time = engine.clock.elapsed;
    if (!force && time - this.lastSampleTime < this.sampleInterval) return;
    this.lastSampleTime = time;
    const energy = engine.energy();
    const index = selectedId ? bodyIndex(engine.world, selectedId) : -1;
    let distance = 0;
    let speed = 0;
    let radius = 0;
    let eccentricity = 0;
    if (index >= 0) {
      const world = engine.world;
      radius = Math.hypot(world.pos[index * 3], world.pos[index * 3 + 1], world.pos[index * 3 + 2]);
      speed = Math.hypot(world.vel[index * 3], world.vel[index * 3 + 1], world.vel[index * 3 + 2]);
      const central = world.mass.reduce((best, mass, i) => (mass > world.mass[best] ? i : best), 0);
      if (central !== index) {
        distance = Math.hypot(
          world.pos[index * 3] - world.pos[central * 3],
          world.pos[index * 3 + 1] - world.pos[central * 3 + 1],
          world.pos[index * 3 + 2] - world.pos[central * 3 + 2],
        );
        eccentricity = calculateOrbitalElements(world, index, central)?.eccentricity ?? 0;
      }
    }
    this.samples.push({
      time,
      kinetic: energy.kinetic,
      potential: energy.potential,
      total: energy.total,
      angularMomentum: energy.angularMomentumMagnitude,
      linearMomentum: length3(energy.linearMomentum),
      distance,
      speed,
      radius,
      eccentricity,
      bodyCount: engine.world.count,
      fps,
    });
    if (this.samples.length > this.maxSamples) this.samples.splice(0, this.samples.length - this.maxSamples);
  }

  series(metric: MetricId): Array<{ time: number; value: number }> {
    return this.samples.map((sample) => ({ time: sample.time, value: sample[metric] }));
  }

  latest(): AnalyticsSample | null {
    return this.samples.at(-1) ?? null;
  }

  energyDrift(): number {
    if (this.samples.length < 2) return 0;
    const initial = this.samples[0].total;
    const current = this.samples.at(-1)!.total;
    if (initial === 0) return 0;
    return (current - initial) / Math.abs(initial);
  }
}

export const analytics = new AnalyticsRecorder();

export const METRICS: Array<{ id: MetricId; label: string; unit: string }> = [
  { id: 'total', label: 'Total energy', unit: 'J' },
  { id: 'kinetic', label: 'Kinetic energy', unit: 'J' },
  { id: 'potential', label: 'Potential energy', unit: 'J' },
  { id: 'angularMomentum', label: 'Angular momentum', unit: 'kg·m²/s' },
  { id: 'linearMomentum', label: 'Linear momentum', unit: 'kg·m/s' },
  { id: 'distance', label: 'Separation', unit: 'm' },
  { id: 'speed', label: 'Speed', unit: 'm/s' },
  { id: 'radius', label: 'Orbital radius', unit: 'm' },
  { id: 'eccentricity', label: 'Eccentricity', unit: '' },
  { id: 'fps', label: 'Frame rate', unit: 'fps' },
];
