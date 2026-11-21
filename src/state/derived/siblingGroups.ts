/** Sibling groupings derived from resolved parent IDs. */

import type { CelestialBody } from '../../types/celestial';
import { bodyIndexMap, parentIndexOf } from './internal';

export interface SiblingOptions {
  /** Include the queried body in the returned siblings (default false). */
  includeSelf?: boolean;
}

/**
 * Groups bodies by resolved parent. Missing, self-referential and unknown
 * parents are grouped under the `null` (root/unresolved) key.
 */
export function siblingGroups(bodies: readonly CelestialBody[]): Map<string | null, CelestialBody[]> {
  const index = bodyIndexMap(bodies);
  const groups = new Map<string | null, CelestialBody[]>();
  for (let at = 0; at < bodies.length; at += 1) {
    const body = bodies[at];
    if (!body) continue;
    const parent = parentIndexOf(bodies, index, at);
    const key = parent === null ? null : bodies[parent]?.id ?? null;
    const group = groups.get(key);
    if (group) group.push(body);
    else groups.set(key, [body]);
  }
  return groups;
}

/** Direct siblings of a body; the body itself is excluded by default. */
export function siblingsOf(
  bodies: readonly CelestialBody[],
  id: string,
  options: SiblingOptions = {},
): CelestialBody[] {
  const index = bodyIndexMap(bodies);
  const at = index.get(id);
  if (at === undefined || !bodies[at]) return [];
  const parent = parentIndexOf(bodies, index, at);
  const key = parent === null ? null : bodies[parent]?.id ?? null;
  const group = siblingGroups(bodies).get(key) ?? [];
  return options.includeSelf ? group : group.filter((body) => body.id !== id);
}

/** IDs of {@link siblingsOf}. */
export function siblingIdsOf(
  bodies: readonly CelestialBody[],
  id: string,
  options: SiblingOptions = {},
): string[] {
  return siblingsOf(bodies, id, options).map((body) => body.id);
}
