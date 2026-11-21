import type { CelestialBody, CollisionMode } from '../../types/celestial';
import type { Vec3 } from '../../types/vector';
import { G } from '../numeric';

/** Scratch buffers reused by the Runge–Kutta integrator to avoid per-step allocation. */
export interface RK4Scratch {
  p0: Float64Array;
  v0: Float64Array;
  a1: Float64Array;
  a2: Float64Array;
  a3: Float64Array;
  a4: Float64Array;
  v2: Float64Array;
  v3: Float64Array;
  v4: Float64Array;
}

/**
 * Structure-of-arrays physics state. Every spatial vector is stored as three
 * consecutive doubles (x, y, z). The solver never allocates during a step.
 */
export interface PhysicsWorld {
  count: number;
  capacity: number;
  ids: string[];
  /** Kilograms. */
  mass: Float64Array;
  /** Metres. */
  radius: Float64Array;
  /** Metres, stride 3. */
  pos: Float64Array;
  /** Metres per second, stride 3. */
  vel: Float64Array;
  /** Metres per second squared, stride 3. */
  acc: Float64Array;
  /** Previous acceleration, required by Velocity Verlet. */
  accPrev: Float64Array;
  /** Whether `accPrev` holds a valid acceleration from a previous step. */
  accInitialized: boolean;
  /** Anchored positions for locked bodies. */
  lockPos: Float64Array;
  /** Anchored velocities for locked bodies. */
  lockVel: Float64Array;
  locked: Uint8Array;
  G: number;
  /** Plummer softening length, metres. */
  softening: number;
  collisionMode: CollisionMode;
  collisionsEnabled: boolean;
  time: number;
  steps: number;
  rk4: RK4Scratch;
}

function allocate(capacity: number) {
  const size = capacity * 3;
  const zeros = () => new Float64Array(size);
  return {
    mass: new Float64Array(capacity),
    radius: new Float64Array(capacity),
    pos: zeros(),
    vel: zeros(),
    acc: zeros(),
    accPrev: zeros(),
    accInitialized: false,
    lockPos: zeros(),
    lockVel: zeros(),
    locked: new Uint8Array(capacity),
    rk4: {
      p0: zeros(),
      v0: zeros(),
      a1: zeros(),
      a2: zeros(),
      a3: zeros(),
      a4: zeros(),
      v2: zeros(),
      v3: zeros(),
      v4: zeros(),
    } satisfies RK4Scratch,
  };
}

export function createPhysicsWorld(capacity = 8): PhysicsWorld {
  const capacitySafe = Math.max(1, Math.floor(capacity));
  return {
    count: 0,
    capacity: capacitySafe,
    ids: [],
    ...allocate(capacitySafe),
    G,
    softening: 1e3,
    collisionMode: 'none',
    collisionsEnabled: false,
    time: 0,
    steps: 0,
  };
}

/** Rebuilds a world from body definitions, preserving state for matching IDs. */
export function worldFromBodies(
  bodies: readonly CelestialBody[],
  options: { G?: number; softening?: number; collisionMode?: CollisionMode; collisionsEnabled?: boolean } = {},
): PhysicsWorld {
  const world = createPhysicsWorld(Math.max(bodies.length, 1));
  world.G = options.G ?? G;
  world.softening = options.softening ?? 1e3;
  world.collisionMode = options.collisionMode ?? 'none';
  world.collisionsEnabled = options.collisionsEnabled ?? false;

  for (const body of bodies) {
    const index = world.count;
    const { physical } = body;
    world.ids.push(body.id);
    world.mass[index] = physical.mass;
    world.radius[index] = physical.radius;
    writeVec3(world.pos, index, physical.position);
    writeVec3(world.vel, index, physical.velocity);
    writeVec3(world.lockPos, index, physical.position);
    writeVec3(world.lockVel, index, physical.velocity);
    world.locked[index] = body.locked ? 1 : 0;
    world.count += 1;
  }

  return world;
}

/** Copies positions and velocities from an older world into a rebuilt world by ID. */
export function transferWorldState(from: PhysicsWorld, to: PhysicsWorld): void {
  const indexById = new Map(from.ids.map((id, index) => [id, index]));
  for (let i = 0; i < to.count; i += 1) {
    const oldIndex = indexById.get(to.ids[i]);
    if (oldIndex === undefined) continue;
    for (let component = 0; component < 3; component += 1) {
      const slot = i * 3 + component;
      to.pos[slot] = from.pos[oldIndex * 3 + component];
      to.vel[slot] = from.vel[oldIndex * 3 + component];
      to.acc[slot] = from.acc[oldIndex * 3 + component];
    }
  }
  to.time = from.time;
  to.steps = from.steps;
  to.accInitialized = from.accInitialized;
  to.accPrev.set(from.accPrev.subarray(0, Math.min(from.count, to.count) * 3), 0);
}

export function writeVec3(buffer: Float64Array, index: number, value: Readonly<Vec3>): void {
  const offset = index * 3;
  buffer[offset] = value.x;
  buffer[offset + 1] = value.y;
  buffer[offset + 2] = value.z;
}

export function readVec3(buffer: Float64Array, index: number): Vec3 {
  const offset = index * 3;
  return { x: buffer[offset], y: buffer[offset + 1], z: buffer[offset + 2] };
}

export function bodyIndex(world: PhysicsWorld, id: string): number {
  return world.ids.indexOf(id);
}

/** Writes solver results back into the user-facing body definitions. */
export function syncWorldToBodies(world: PhysicsWorld, bodies: CelestialBody[]): void {
  for (let i = 0; i < world.count && i < bodies.length; i += 1) {
    const physical = bodies[i].physical;
    physical.position = readVec3(world.pos, i);
    physical.velocity = readVec3(world.vel, i);
    physical.acceleration = readVec3(world.acc, i);
  }
}

export function restoreLockedBodies(world: PhysicsWorld): void {
  for (let i = 0; i < world.count; i += 1) {
    if (!world.locked[i]) continue;
    for (let component = 0; component < 3; component += 1) {
      const slot = i * 3 + component;
      world.pos[slot] = world.lockPos[slot];
      world.vel[slot] = world.lockVel[slot];
    }
  }
}

export function setLock(world: PhysicsWorld, index: number, locked: boolean): void {
  world.locked[index] = locked ? 1 : 0;
  if (locked) {
    for (let component = 0; component < 3; component += 1) {
      const slot = index * 3 + component;
      world.lockPos[slot] = world.pos[slot];
      world.lockVel[slot] = world.vel[slot];
    }
  }
}
