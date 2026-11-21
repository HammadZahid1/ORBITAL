/** Subtree membership selectors with iterative, cycle-safe traversal. */

import type { CelestialBody } from '../../types/celestial';
import {
  bodyIndexMap,
  childrenIndexMap,
  lookupBodyIndex,
} from './internal';
import { parentChainIds } from './parentChain';

export interface DescendantOptions {
  /** Include the requested root itself in the result (default false). */
  includeRoot?: boolean;
}

/** Bodies in the subtree of `rootId`; the root is excluded unless requested. */
export function descendantsOf(
  bodies: readonly CelestialBody[],
  rootId: string,
  options: DescendantOptions = {},
): CelestialBody[] {
  const index = bodyIndexMap(bodies);
  const root = index.get(rootId);
  if (root === undefined) return [];

  const children = childrenIndexMap(bodies, index);
  const visited = new Set<number>([root]);
  const stack: number[] = [...(children.get(root) ?? [])];
  const result: CelestialBody[] = [];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const body = bodies[current];
    if (!body) continue;
    result.push(body);
    const next = children.get(current);
    if (next) for (let i = next.length - 1; i >= 0; i -= 1) stack.push(next[i]);
  }

  if (options.includeRoot && bodies[root]) result.unshift(bodies[root]);
  return result;
}

/** IDs of {@link descendantsOf}. */
export function subtreeIds(
  bodies: readonly CelestialBody[],
  rootId: string,
  options: DescendantOptions = {},
): string[] {
  return descendantsOf(bodies, rootId, options).map((body) => body.id);
}

/** True when `candidateId` is anywhere below `ancestorId` in the hierarchy. */
export function isDescendantOf(
  bodies: readonly CelestialBody[],
  candidateId: string,
  ancestorId: string,
): boolean {
  if (candidateId === ancestorId) return false;
  return parentChainIds(bodies, candidateId).includes(ancestorId);
}

/** Number of recoverable bodies in a subtree, including the root when present. */
export function subtreeSize(bodies: readonly CelestialBody[], rootId: string): number {
  return lookupBodyIndex(bodies, rootId) < 0 ? 0 : 1 + descendantsOf(bodies, rootId).length;
}
