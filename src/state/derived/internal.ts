/**
 * Shared finite-safe primitives for the derived-state selectors.
 *
 * The helpers here never mutate their inputs and never return NaN/Infinity:
 * invalid or missing data is represented with `null`, zero or an empty value.
 * They are deliberately independent of React and Zustand.
 */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import type { Vec3 } from '../../types/vector';

/** Returns the value when it is a finite number, otherwise null. */
export function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Returns the value when finite, otherwise zero. */
export function finiteOrZero(value: number | null | undefined): number {
  return finiteNumber(value) ?? 0;
}

/** Returns the value when finite and strictly positive, otherwise null. */
export function finitePositive(value: number | null | undefined): number | null {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

/** Maps overflow to the largest finite double so derived values stay finite. */
export function clampFinite(value: number): number {
  if (Number.isFinite(value)) return value;
  if (value > 0) return Number.MAX_VALUE;
  if (value < 0) return -Number.MAX_VALUE;
  return 0;
}

/** Finite addition; an overflowing partial sum saturates instead of becoming Infinity. */
export function addFinite(left: number, right: number): number {
  return clampFinite(finiteOrZero(left) + finiteOrZero(right));
}

/** Returns a finite quotient, or null for invalid input or division by zero. */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

/** Copies a vector when all components are finite, otherwise returns null. */
export function finiteVec3(value: Vec3 | null | undefined): Vec3 | null {
  if (!value) return null;
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return null;
  return { x: value.x, y: value.y, z: value.z };
}

export function zeroVec3(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

/** Vector difference with finite, saturated components. */
export function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: clampFinite(left.x - right.x),
    y: clampFinite(left.y - right.y),
    z: clampFinite(left.z - right.z),
  };
}

/** Finite vector magnitude. */
export function magnitude(value: Vec3): number {
  return clampFinite(Math.hypot(finiteOrZero(value.x), finiteOrZero(value.y), finiteOrZero(value.z)));
}

/** Finite Euclidean distance between two validated vectors. */
export function distanceBetween(left: Vec3, right: Vec3): number {
  return magnitude(subtractVec3(left, right));
}

/**
 * Number of usable world slots. Malformed counts, short typed arrays and extra
 * IDs are all clamped away so no selector reads past a buffer.
 */
export function worldSize(world: PhysicsWorld): number {
  const count = finiteNumber(world.count);
  if (count === null) return 0;
  const ids = Array.isArray(world.ids) ? world.ids.length : 0;
  const mass = world.mass?.length ?? 0;
  const radius = world.radius?.length ?? 0;
  const pos = Math.floor((world.pos?.length ?? 0) / 3);
  const vel = Math.floor((world.vel?.length ?? 0) / 3);
  return Math.max(0, Math.min(Math.floor(count), ids, mass, radius, pos, vel));
}

/** First-occurrence ID -> world index map; duplicate IDs keep their first slot. */
export function worldIndexMap(world: PhysicsWorld): Map<string, number> {
  const map = new Map<string, number>();
  for (let index = 0; index < worldSize(world); index += 1) {
    const id = world.ids[index];
    if (typeof id === 'string' && !map.has(id)) map.set(id, index);
  }
  return map;
}

export function lookupWorldIndex(world: PhysicsWorld, id: string): number {
  return worldIndexMap(world).get(id) ?? -1;
}

export function worldIdAt(world: PhysicsWorld, index: number): string | null {
  if (!Number.isInteger(index) || index < 0 || index >= worldSize(world)) return null;
  const id = world.ids[index];
  return typeof id === 'string' ? id : null;
}

export function worldMass(world: PhysicsWorld, index: number): number | null {
  if (!Number.isInteger(index) || index < 0) return null;
  return finiteNumber(world.mass?.[index]);
}

export function worldPositiveMass(world: PhysicsWorld, index: number): number | null {
  return finitePositive(worldMass(world, index));
}

export function worldRadius(world: PhysicsWorld, index: number): number | null {
  if (!Number.isInteger(index) || index < 0) return null;
  return finitePositive(world.radius?.[index]);
}

function worldVector(buffer: Float64Array | undefined, index: number): Vec3 | null {
  if (!Number.isInteger(index) || index < 0 || !buffer || index * 3 + 2 >= buffer.length) return null;
  return finiteVec3({
    x: buffer[index * 3],
    y: buffer[index * 3 + 1],
    z: buffer[index * 3 + 2],
  });
}

export function worldPosition(world: PhysicsWorld, index: number): Vec3 | null {
  return worldVector(world.pos, index);
}

export function worldVelocity(world: PhysicsWorld, index: number): Vec3 | null {
  return worldVector(world.vel, index);
}

/** First-occurrence ID -> body array index map; duplicate IDs keep their first entry. */
export function bodyIndexMap(bodies: readonly CelestialBody[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let index = 0; index < bodies.length; index += 1) {
    const id = bodies[index]?.id;
    if (typeof id === 'string' && !map.has(id)) map.set(id, index);
  }
  return map;
}

export function lookupBodyIndex(bodies: readonly CelestialBody[], id: string): number {
  return bodyIndexMap(bodies).get(id) ?? -1;
}

export function bodyById(bodies: readonly CelestialBody[], id: string): CelestialBody | null {
  const index = lookupBodyIndex(bodies, id);
  return index >= 0 ? bodies[index] : null;
}

/** Alias used by selectors that build a world index for membership checks. */
export function buildWorldIndex(world: PhysicsWorld): Map<string, number> {
  return worldIndexMap(world);
}

/** Resolved parent array index, or null for roots, missing parents and self-parents. */
export function parentIndexOf(
  bodies: readonly CelestialBody[],
  indexMap: Map<string, number>,
  index: number,
): number | null {
  const body = bodies[index];
  if (!body || typeof body.parentId !== 'string') return null;
  const parent = indexMap.get(body.parentId);
  return parent === undefined || parent === index ? null : parent;
}

/** Adjacency list of resolved parent -> children indices, in body-array order. */
export function childrenIndexMap(
  bodies: readonly CelestialBody[],
  indexMap: Map<string, number> = bodyIndexMap(bodies),
): Map<number, number[]> {
  const children = new Map<number, number[]>();
  for (let index = 0; index < bodies.length; index += 1) {
    const parent = parentIndexOf(bodies, indexMap, index);
    if (parent === null) continue;
    const list = children.get(parent);
    if (list) list.push(index);
    else children.set(parent, [index]);
  }
  return children;
}

/** Mass from the world when a valid index is available, otherwise from the body definition. */
export function massOf(
  body: CelestialBody,
  world?: PhysicsWorld | null,
  worldIndexValue?: number,
): number | null {
  if (world && worldIndexValue !== undefined && worldIndexValue >= 0) {
    const mass = worldMass(world, worldIndexValue);
    if (mass !== null) return mass;
  }
  return finiteNumber(body.physical?.mass);
}

/** Radius from the world when a valid index is available, otherwise from the body definition. */
export function radiusOf(
  body: CelestialBody,
  world?: PhysicsWorld | null,
  worldIndexValue?: number,
): number | null {
  if (world && worldIndexValue !== undefined && worldIndexValue >= 0) {
    const radius = worldRadius(world, worldIndexValue);
    if (radius !== null) return radius;
  }
  return finitePositive(body.physical?.radius);
}

/** Deterministic ascending ID comparison, useful as a ranking tie-breaker. */
export function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Normalises a string query without throwing on malformed input. */
export function normaliseText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** Converts an arbitrary limit into a non-negative integer. */
export function boundedLimit(value: number | undefined, fallback: number): number {
  const number = finiteNumber(value);
  if (number === null) return fallback;
  return Math.max(0, Math.floor(number));
}
