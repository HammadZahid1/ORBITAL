/** Ancestor-chain selectors. Chains always terminate on roots, missing IDs and cycles. */

import type { CelestialBody } from '../../types/celestial';
import { bodyIndexMap, parentIndexOf } from './internal';

/**
 * Ancestor chain starting with the requested body and ending at its oldest
 * resolvable ancestor. A cycle contributes each of its members at most once.
 */
export function parentChain(bodies: readonly CelestialBody[], id: string): CelestialBody[] {
  const index = bodyIndexMap(bodies);
  let current: number | undefined = index.get(id);
  if (current === undefined) return [];

  const chain: CelestialBody[] = [];
  const visited = new Set<number>();
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    const body = bodies[current];
    if (!body) break;
    chain.push(body);
    const parent = parentIndexOf(bodies, index, current);
    if (parent === null || visited.has(parent)) break;
    current = parent;
  }
  return chain;
}

/** IDs of {@link parentChain}, in body-to-root order. */
export function parentChainIds(bodies: readonly CelestialBody[], id: string): string[] {
  return parentChain(bodies, id).map((body) => body.id);
}

/** Number of resolved ancestors above a body (a root has depth zero). */
export function ancestryDepth(bodies: readonly CelestialBody[], id: string): number {
  return Math.max(0, parentChain(bodies, id).length - 1);
}

/** True when `ancestorId` occurs anywhere in the parent chain of `id`. */
export function hasAncestor(bodies: readonly CelestialBody[], id: string, ancestorId: string): boolean {
  return parentChainIds(bodies, id).includes(ancestorId);
}
