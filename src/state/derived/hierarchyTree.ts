/** Builds an acyclic, iterable system hierarchy from parent IDs. */

import type { CelestialBody } from '../../types/celestial';
import { bodyIndexMap, childrenIndexMap, parentIndexOf } from './internal';

export interface HierarchyNode {
  id: string;
  body: CelestialBody;
  /** Zero for a root, one for a root's child, and so on. */
  depth: number;
  children: HierarchyNode[];
}

/**
 * Builds the hierarchy forest. Unresolved parents and self-parents become roots.
 * Parent cycles are broken deterministically (the lowest array index in each
 * cycle becomes a root), so every unique body appears exactly once.
 */
export function buildHierarchyTree(bodies: readonly CelestialBody[]): HierarchyNode[] {
  const index = bodyIndexMap(bodies);
  const resolved = new Map<number, number | null>();
  for (let at = 0; at < bodies.length; at += 1) {
    if (!bodies[at]) continue;
    resolved.set(at, index.get(bodies[at].id) === at ? parentIndexOf(bodies, index, at) : null);
  }

  const children = childrenIndexMap(bodies, index);
  const settled = new Set<number>();
  const broken = new Set<number>();
  for (let start = 0; start < bodies.length; start += 1) {
    if (!resolved.has(start) || settled.has(start) || broken.has(start)) continue;
    const path: number[] = [];
    const position = new Map<number, number>();
    let current: number | null = start;
    while (
      current !== null &&
      resolved.has(current) &&
      !settled.has(current) &&
      !broken.has(current)
    ) {
      const previous = position.get(current);
      if (previous !== undefined) {
        const orderedCycle = path.slice(previous);
        // Re-root the cycle at its lowest-index member by reversing every
        // in-cycle edge. The representative becomes a root and the remaining
        // members stay reachable instead of becoming an orphaned island.
        const representativeIndex = orderedCycle.reduce(
          (best, member, at) => (member < orderedCycle[best] ? at : best),
          0,
        );
        const rotated = [...orderedCycle.slice(representativeIndex), ...orderedCycle.slice(0, representativeIndex)];
        const cycleSet = new Set(orderedCycle);
        for (const member of rotated) {
          const oldParent = resolved.get(member) ?? null;
          if (oldParent !== null && cycleSet.has(oldParent)) {
            const remaining = (children.get(oldParent) ?? []).filter((child) => child !== member);
            if (remaining.length > 0) children.set(oldParent, remaining);
            else children.delete(oldParent);
          }
        }
        resolved.set(rotated[0], null);
        for (let at = 1; at < rotated.length; at += 1) {
          const child = rotated[at];
          const parent = rotated[at - 1];
          resolved.set(child, parent);
          const siblings = children.get(parent) ?? [];
          if (!siblings.includes(child)) siblings.push(child);
          children.set(parent, siblings);
        }
        for (const member of orderedCycle) broken.add(member);
        break;
      }
      position.set(current, path.length);
      path.push(current);
      current = resolved.get(current) ?? null;
    }
    for (const member of path) settled.add(member);
  }

  const nodeByIndex = new Map<number, HierarchyNode>();
  const roots: HierarchyNode[] = [];
  const rootIndices: number[] = [];
  for (let at = 0; at < bodies.length; at += 1) {
    if (resolved.get(at) === null && bodies[at]) rootIndices.push(at);
  }
  const pending: Array<{ index: number; parent: HierarchyNode | null }> = rootIndices
    .reverse()
    .map((indexValue) => ({ index: indexValue, parent: null }));

  while (pending.length > 0) {
    const { index: at, parent } = pending.pop()!;
    const body = bodies[at];
    if (!body || nodeByIndex.has(at)) continue;
    const node: HierarchyNode = {
      id: body.id,
      body,
      depth: parent ? parent.depth + 1 : 0,
      children: [],
    };
    nodeByIndex.set(at, node);
    if (parent) parent.children.push(node);
    else roots.push(node);

    const descendantIndices = children.get(at) ?? [];
    for (let i = descendantIndices.length - 1; i >= 0; i -= 1) {
      pending.push({ index: descendantIndices[i], parent: node });
    }
  }

  return roots;
}

/** Largest depth of the built hierarchy, or -1 for an empty body list. */
export function maxHierarchyDepth(bodies: readonly CelestialBody[]): number {
  let maximum = -1;
  const pending: Array<{ node: HierarchyNode; depth: number }> = buildHierarchyTree(bodies).map((node) => ({
    node,
    depth: 0,
  }));
  while (pending.length > 0) {
    const { node, depth } = pending.pop()!;
    maximum = Math.max(maximum, depth);
    for (const child of node.children) pending.push({ node: child, depth: depth + 1 });
  }
  return maximum;
}
