import type { CelestialBody, CollisionMode, IntegratorId } from '../../types/celestial';
import { detectCollisions, resolveCollisions, type CollisionEvent } from '../collision/collision';
import { computeEnergy, type EnergySnapshot } from '../energy/energy';
import { centerOfMass } from '../coordinates/barycenter';
import { getIntegrator } from '../integrators';
import { computeAccelerations } from '../physics/gravity';
import {
  createPhysicsWorld,
  restoreLockedBodies,
  syncWorldToBodies,
  transferWorldState,
  worldFromBodies,
  type PhysicsWorld,
} from '../physics/world';
import { SimulationClock } from './clock';

export interface SimulationOptions {
  G: number;
  softening: number;
  timestep: number;
  integrator: IntegratorId;
  collisionMode: CollisionMode;
  collisionsEnabled: boolean;
  /** Cap on solver substeps per animation frame, protecting against tab stalls. */
  maxStepsPerFrame: number;
}

export const DEFAULT_SIMULATION_OPTIONS: SimulationOptions = {
  G: 6.6743e-11,
  softening: 1e5,
  timestep: 3600,
  integrator: 'velocity-verlet',
  collisionMode: 'none',
  collisionsEnabled: false,
  maxStepsPerFrame: 32,
};

/**
 * Owns the physics world and advances it in fixed-size steps. Rendering code
 * reads `world` directly; React state is only refreshed at a throttled rate.
 */
export class SimulationEngine {
  world: PhysicsWorld;
  clock = new SimulationClock();
  options: SimulationOptions;
  bodies: CelestialBody[];
  events: CollisionEvent[] = [];
  onCollision: ((event: CollisionEvent) => void) | null = null;
  private integratorId: IntegratorId;

  constructor(bodies: CelestialBody[], options: Partial<SimulationOptions> = {}) {
    this.options = { ...DEFAULT_SIMULATION_OPTIONS, ...options };
    this.integratorId = this.options.integrator;
    this.bodies = bodies;
    this.world = worldFromBodies(bodies, this.options);
    computeAccelerations(this.world);
    this.world.accPrev.set(this.world.acc.subarray(0, this.world.count * 3), 0);
    this.world.accInitialized = true;
    syncWorldToBodies(this.world, this.bodies);
  }

  get integrator(): IntegratorId {
    return this.integratorId;
  }

  set integrator(value: IntegratorId) {
    this.integratorId = value;
    this.options.integrator = value;
  }

  /** Replaces the body set while keeping positions for objects that still exist. */
  setBodies(bodies: CelestialBody[], preserveState = true): void {
    const nextWorld = worldFromBodies(bodies, this.options);
    if (preserveState && this.world.count > 0) transferWorldState(this.world, nextWorld);
    this.bodies = bodies;
    this.world = nextWorld;
    computeAccelerations(this.world);
    this.world.accInitialized = false;
    syncWorldToBodies(this.world, this.bodies);
  }

  reset(bodies = this.bodies): void {
    this.world = worldFromBodies(bodies, this.options);
    this.bodies = bodies;
    this.clock.reset();
    this.events = [];
    computeAccelerations(this.world);
    this.world.accInitialized = false;
    syncWorldToBodies(this.world, this.bodies);
  }

  /** Advances exactly one fixed solver step. */
  step(dt = this.options.timestep): CollisionEvent[] {
    if (this.world.count === 0) return [];
    const integrator = getIntegrator(this.integratorId);
    integrator.step(this.world, dt, computeAccelerations);
    restoreLockedBodies(this.world);
    this.world.time += dt;
    this.world.steps += 1;
    this.clock.steps += 1;

    const collisions = detectCollisions(this.world);
    if (collisions.length > 0) {
      const resolved = resolveCollisions(this.world, collisions, this.options.collisionMode);
      this.events.push(...resolved);
      for (const event of resolved) this.onCollision?.(event);
    }
    return collisions;
  }

  /**
   * Advances by a real-time delta, decomposing it into fixed solver steps.
   * Returns the number of steps actually executed.
   */
  advance(realDeltaSeconds: number): number {
    const simulated = this.clock.advance(realDeltaSeconds);
    if (simulated <= 0) return 0;
    const dt = Math.max(this.options.timestep, 1e-6);
    const requested = Math.floor(Math.abs(simulated) / dt);
    const steps = Math.min(requested, this.options.maxStepsPerFrame);
    const direction = simulated < 0 ? -1 : 1;
    for (let i = 0; i < steps; i += 1) {
      this.step(dt * direction);
      this.world.time = this.clock.elapsed;
    }
    if (steps > 0) syncWorldToBodies(this.world, this.bodies);
    return steps;
  }

  /** Performs a single backward step by reversing all velocities. */
  stepBackward(): void {
    for (let i = 0; i < this.world.count * 3; i += 1) this.world.vel[i] *= -1;
    this.step();
    for (let i = 0; i < this.world.count * 3; i += 1) this.world.vel[i] *= -1;
    this.clock.stepBackward(this.options.timestep);
    syncWorldToBodies(this.world, this.bodies);
  }

  energy(): EnergySnapshot {
    return computeEnergy(this.world);
  }

  barycenter(): { x: number; y: number; z: number } {
    return centerOfMass(this.world);
  }

  snapshot(): { positions: Float64Array; velocities: Float64Array; time: number } {
    return {
      positions: this.world.pos.slice(0, this.world.count * 3),
      velocities: this.world.vel.slice(0, this.world.count * 3),
      time: this.world.time,
    };
  }
}

export function createSimulationEngine(
  bodies: CelestialBody[],
  options: Partial<SimulationOptions> = {},
): SimulationEngine {
  return new SimulationEngine(bodies, options);
}

export function emptyWorld() {
  return createPhysicsWorld(1);
}
