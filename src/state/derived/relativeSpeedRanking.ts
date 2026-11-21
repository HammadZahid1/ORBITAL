/** Ranking of parent-relative speeds with deterministic tie handling. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { relativeVelocityToParent } from './relativeVelocity';
import { boundedLimit, compareIds, magnitude } from './internal';

export interface RelativeSpeedEntry {
  id: string;
  parentId: string | null;
  /** Finite relative speed; zero when the relationship or state is invalid. */
  speed: number;
  /** One-based position in the descending ranking. */
  rank: number;
  /** False for roots, missing parents and non-finite world state. */
  valid: boolean;
}

/** All unique bodies ordered from fastest to slowest relative to their parent. */
export function rankRelativeSpeeds(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
): RelativeSpeedEntry[] {
  const entries: RelativeSpeedEntry[] = [];
  const seen = new Set<string>();
  for (const body of bodies) {
    if (!body || seen.has(body.id)) continue;
    seen.add(body.id);
    const velocity = relativeVelocityToParent(world, bodies, body.id);
    entries.push({
      id: body.id,
      parentId: typeof body.parentId === 'string' ? body.parentId : null,
      speed: velocity ? magnitude(velocity) : 0,
      rank: 0,
      valid: velocity !== null,
    });
  }
  entries.sort((left, right) => right.speed - left.speed || compareIds(left.id, right.id));
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  return entries;
}

/** First `limit` entries of {@link rankRelativeSpeeds}. */
export function topRelativeSpeeds(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  limit: number,
): RelativeSpeedEntry[] {
  return rankRelativeSpeeds(world, bodies).slice(0, boundedLimit(limit, 0));
}

/** Body ID with the highest finite parent-relative speed, or null for no bodies. */
export function fastestRelativeBody(world: PhysicsWorld, bodies: readonly CelestialBody[]): string | null {
  const first = rankRelativeSpeeds(world, bodies).find((entry) => entry.valid);
  return first?.id ?? null;
}
