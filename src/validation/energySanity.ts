import { computeEnergy } from '../engine/energy/energy';
import { worldFromBodies } from '../engine/physics/world';
import { isFiniteNumber } from './guards';
import { makeIssue } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Detects non-finite or absurd total/kinetic/potential energies. */

const LARGE_ENERGY = 1e45;
const EXTREME_ENERGY = 1e48;

export function checkEnergySanity(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { bodies, settings } = universe;
  if (bodies.length === 0) return issues;

  const world = worldFromBodies(bodies, {
    G: settings.G,
    softening: settings.softening,
    collisionMode: settings.collisionMode,
    collisionsEnabled: settings.collisionsEnabled,
  });
  const energy = computeEnergy(world);
  const values = [
    ['kinetic energy', energy.kinetic],
    ['potential energy', energy.potential],
    ['total energy', energy.total],
  ] as const;

  for (const [label, value] of values) {
    if (!isFiniteNumber(value)) {
      issues.push(
        makeIssue(ISSUE_CODES.ENERGY_NON_FINITE, 'error', `Total ${label} is not finite.`, 'bodies', {
          details: { value: String(value) },
        }),
      );
    }
  }

  for (const [label, value] of values) {
    if (!isFiniteNumber(value)) continue;
    const magnitude = Math.abs(value);
    if (magnitude > EXTREME_ENERGY) {
      issues.push(
        makeIssue(
          ISSUE_CODES.ENERGY_EXTREME,
          'error',
          `${label} of ${value.toExponential(2)} J is beyond a sane simulation range.`,
          'bodies',
          { details: { value, limit: EXTREME_ENERGY } },
        ),
      );
    } else if (magnitude > LARGE_ENERGY) {
      issues.push(
        makeIssue(
          ISSUE_CODES.ENERGY_EXTREME,
          'warning',
          `${label} of ${value.toExponential(2)} J is unusually large.`,
          'bodies',
          { details: { value, limit: LARGE_ENERGY } },
        ),
      );
    }
  }
  return issues;
}
