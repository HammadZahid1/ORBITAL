/** Ranking of body-to-parent physical radius ratios. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import {
  boundedLimit,
  buildWorldIndex,
  clampFinite,
  compareIds,
  finiteNumber,
  radiusOf,
  safeDivide,
  worldIndexMap,
} from './internal';

export interface RadiusRatioEntry {
  id: string;
  parentId: string | null;
  /** Finite r_body / r_parent, or null when undefined. */
  ratio: number | null;
  /** One-based rank; undefined ratios are placed last. */
  rank: number;
  valid: boolean;
}

/** Physical radius ratio of one body against its hierarchical parent. */
export function radiusRatioForBody(
  bodies: readonly CelestialBody[],
  id: string,
  world?: PhysicsWorld | null,
): number | null {
  const body = bodies.find((candidate) => candidate?.id === id);
  if (!body || typeof body.parentId !== 'string') return null;
  const parent = bodies.find((candidate) => candidate?.id === body.parentId);
  if (!parent || parent.id === id) return null;

  const worldById = world ? worldIndexMap(world) : null;
  const bodyRadius = radiusOf(body, world, worldById?.get(id));
  const parentRadius = radiusOf(parent, world, worldById?.get(parent.id));
  if (bodyRadius === null || parentRadius === null) return null;
  const ratio = safeDivide(bodyRadius, parentRadius);
  if (ratio === null || ratio < 0) return null;
  return finiteNumber(clampFinite(ratio)) ?? null;
}

/** All unique bodies ordered by descending parent radius ratio. */
export function rankRadiusRatios(
  bodies: readonly CelestialBody[],
  world?: PhysicsWorld | null,
): RadiusRatioEntry[] {
  const entries: RadiusRatioEntry[] = [];
  const seen = new Set<string>();
  const present = world ? buildWorldIndex(world) : null;
  for (const body of bodies) {
    if (!body || seen.has(body.id) || (present && !present.has(body.id))) continue;
    seen.add(body.id);
    entries.push({
      id: body.id,
      parentId: typeof body.parentId === 'string' ? body.parentId : null,
      ratio: radiusRatioForBody(bodies, body.id, world),
      rank: 0,
      valid: false,
    });
  }
  entries.forEach((entry) => {
    entry.valid = entry.ratio !== null;
  });
  entries.sort((left, right) => {
    if (left.ratio === null && right.ratio === null) return compareIds(left.id, right.id);
    if (left.ratio === null) return 1;
    if (right.ratio === null) return -1;
    return right.ratio - left.ratio || compareIds(left.id, right.id);
  });
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  return entries;
}

/** Largest finite parent radius ratios. */
export function topRadiusRatios(
  bodies: readonly CelestialBody[],
  limit: number,
  world?: PhysicsWorld | null,
): RadiusRatioEntry[] {
  return rankRadiusRatios(bodies, world)
    .filter((entry) => entry.valid)
    .slice(0, boundedLimit(limit, 0));
}
