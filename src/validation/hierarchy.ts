import { bodyPath, makeIssue, setNullRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Parent references must resolve and the parent graph must be acyclic. */

const MAX_DEPTH = 32;

export function checkHierarchy(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const indexById = new Map<string, number>();
  universe.bodies.forEach((body, index) => {
    if (!indexById.has(body.id)) indexById.set(body.id, index);
  });

  const parents: Array<number | null> = universe.bodies.map((body) => {
    if (body.parentId === null) return null;
    const parent = indexById.get(body.parentId);
    return parent === undefined ? null : parent;
  });

  universe.bodies.forEach((body, index) => {
    if (body.parentId === null) return;
    const parentPath = bodyPath(index, 'parentId');
    const parent = indexById.get(body.parentId);
    if (parent === undefined) {
      issues.push(
        makeIssue(
          ISSUE_CODES.PARENT_MISSING,
          'error',
          `Parent '${body.parentId}' does not exist in this universe.`,
          parentPath,
          {
            bodyId: body.id,
            details: { parentId: body.parentId },
            repair: setNullRepair(parentPath, 'Detach the missing parent reference.'),
          },
        ),
      );
    } else if (parent === index) {
      issues.push(
        makeIssue(ISSUE_CODES.PARENT_SELF, 'error', 'A body cannot be its own parent.', parentPath, {
          bodyId: body.id,
          repair: setNullRepair(parentPath, 'Remove the self-reference.'),
        }),
      );
    }
  });

  // Each node has at most one parent, so following parent pointers finds cycles
  // without needing an explicit adjacency list.
  const done = new Uint8Array(universe.bodies.length);
  const reportedCycles = new Set<string>();
  for (let start = 0; start < universe.bodies.length; start += 1) {
    if (done[start] === 1) continue;
    const chain = new Map<number, number>();
    let current: number | null = start;
    while (current !== null && done[current] === 0 && !chain.has(current)) {
      chain.set(current, chain.size);
      current = parents[current];
    }
    if (current !== null && chain.has(current)) {
      const cycleStart = chain.get(current)!;
      const members = [...chain.entries()]
        .filter(([, order]) => order >= cycleStart)
        .map(([index]) => index);
      const key = members.map((index) => universe.bodies[index].id).sort().join('|');
      // Self-parenting is reported separately as PARENT_SELF.
      if (members.length > 1 && !reportedCycles.has(key)) {
        reportedCycles.add(key);
        const names = members.map((index) => universe.bodies[index].id).join(' -> ');
        issues.push(
          makeIssue(
            ISSUE_CODES.HIERARCHY_CYCLE,
            'error',
            `Parent cycle detected: ${names} -> ${universe.bodies[current].id}.`,
            bodyPath(members[0], 'parentId'),
            {
              bodyId: universe.bodies[members[0]].id,
              details: { members: names, count: members.length },
              repair: setNullRepair(
                bodyPath(members[0], 'parentId'),
                'Break the cycle by detaching one parent reference.',
              ),
            },
          ),
        );
      }
    }
    for (const index of chain.keys()) done[index] = 1;
  }

  universe.bodies.forEach((body, index) => {
    const visited = new Set<number>();
    let current: number | null = index;
    let depth = 0;
    while (current !== null && parents[current] !== null && !visited.has(current) && depth <= MAX_DEPTH) {
      visited.add(current);
      current = parents[current];
      depth += 1;
    }
    if (depth > MAX_DEPTH) {
      issues.push(
        makeIssue(
          ISSUE_CODES.HIERARCHY_DEEP,
          'warning',
          `Parent chain for '${body.id}' exceeds ${MAX_DEPTH} levels.`,
          bodyPath(index, 'parentId'),
          { bodyId: body.id, details: { maxDepth: MAX_DEPTH } },
        ),
      );
    }
  });
  return issues;
}
