import { isFiniteNumber } from './guards';
import { bodyPath, makeIssue } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Initial-state overlap warnings. The solver, not this check, resolves collisions. */

export function checkCollisionOverlap(
  universe: Universe,
  maxPairs = 500_000,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { bodies } = universe;
  let comparisons = 0;

  outer: for (let i = 0; i < bodies.length; i += 1) {
    const first = bodies[i];
    const a = first.physical;
    for (let j = i + 1; j < bodies.length; j += 1) {
      const second = bodies[j];
      const b = second.physical;
      const values = [a.position.x, a.position.y, a.position.z, b.position.x, b.position.y, b.position.z, a.radius, b.radius];
      if (!values.every(isFiniteNumber)) continue;
      if (comparisons >= maxPairs) {
        issues.push(
          makeIssue(
            ISSUE_CODES.OVERLAP_SCAN_TRUNCATED,
            'info',
            `Overlap scan stopped after ${maxPairs} pair comparisons.`,
            'bodies',
            { details: { maxPairs } },
          ),
        );
        break outer;
      }
      comparisons += 1;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dz = b.position.z - a.position.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      const contact = a.radius + b.radius;
      if (distanceSquared < contact * contact) {
        const distance = Math.sqrt(distanceSquared);
        issues.push(
          makeIssue(
            ISSUE_CODES.OVERLAP,
            'warning',
            `Bodies '${first.id}' and '${second.id}' overlap at the initial state.`,
            bodyPath(j, 'physical.position'),
            {
              bodyId: first.id,
              details: { firstId: first.id, secondId: second.id, distance, contactDistance: contact },
            },
          ),
        );
      }
    }
  }
  return issues;
}
