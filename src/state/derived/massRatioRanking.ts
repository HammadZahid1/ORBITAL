/** Ranking of body-to-parent mass ratios. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import {
  boundedLimit,
  buildWorldIndex,
  clampFinite,
  compareIds,
  finiteNumber,
  massOf,
  safeDivide,
  worldIndexMap,
} from './internal';

export interface MassRatioEntry {
  id: string;
  parentId: string | null;
  /** Finite m_body / m_parent, or null when undefined. */
  ratio: number | null;
  /** One-based rank; undefined ratios are placed last. */
  rank: number;
  valid: boolean;
}

/** Mass ratio of one body against its hierarchical parent. */
export function massRatioForBody(
  bodies: readonly CelestialBody[],
  id: string,
  world?: PhysicsWorld | null,
): number | null {
  const body = bodies.find((candidate) => candidate?.id === id);
  if (!body || typeof body.parentId !== 'string') return null;
  const parent = bodies.find((candidate) => candidate?.id === body.parentId);
  if (!parent || parent.id === id) return null;

  const worldById = world ? worldIndexMap(world) : null;
  const bodyMass = massOf(body, world, worldById?.get(id));
  const parentMass = massOf(parent, world, worldById?.get(parent.id));
  if (bodyMass === null || parentMass === null || bodyMass < 0 || parentMass <= 0) return null;
  const ratio = safeDivide(bodyMass, parentMass);
  if (ratio === null || ratio < 0) return null;
  return finiteNumber(clampFinite(ratio)) ?? null;
}

/** All unique bodies ordered by descending parent mass ratio. */
export function rankMassRatios(
  bodies: readonly CelestialBody[],
  world?: PhysicsWorld | null,
): MassRatioEntry[] {
  const entries: MassRatioEntry[] = [];
  const seen = new Set<string>();
  const present = world ? buildWorldIndex(world) : null;
  for (const body of bodies) {
    if (!body || seen.has(body.id) || (present && !present.has(body.id))) continue;
    seen.add(body.id);
    entries.push({
      id: body.id,
      parentId: typeof body.parentId === 'string' ? body.parentId : null,
      ratio: massRatioForBody(bodies, body.id, world),
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

/** Largest finite parent mass ratios. */
export function topMassRatios(
  bodies: readonly CelestialBody[],
  limit: number,
  world?: PhysicsWorld | null,
): MassRatioEntry[] {
  return rankMassRatios(bodies, world)
    .filter((entry) => entry.valid)
    .slice(0, boundedLimit(limit, 0));
}
