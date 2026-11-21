import { computeEnergy } from '../engine/energy/energy';
import { C } from '../engine/numeric';
import { worldFromBodies } from '../engine/physics/world';
import { isFiniteNumber } from './guards';
import { makeIssue } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Linear momentum and centre-of-mass drift sanity. */

const DRIFT_FRACTION = 0.01;

export function checkMomentumSanity(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { bodies, settings } = universe;
  if (bodies.length === 0) return issues;

  const world = worldFromBodies(bodies, {
    G: settings.G,
    softening: settings.softening,
  });
  const momentum = computeEnergy(world).linearMomentum;
  const components = [momentum.x, momentum.y, momentum.z];
  if (!components.every(isFiniteNumber)) {
    issues.push(
      makeIssue(ISSUE_CODES.MOMENTUM_NON_FINITE, 'error', 'Total linear momentum is not finite.', 'bodies', {
        details: { x: String(momentum.x), y: String(momentum.y), z: String(momentum.z) },
      }),
    );
    return issues;
  }

  const totalMass = bodies.reduce((sum, body) => sum + body.physical.mass, 0);
  if (!isFiniteNumber(totalMass) || totalMass <= 0) return issues;
  const drift = Math.hypot(...components) / totalMass;
  if (!isFiniteNumber(drift)) return issues;

  if (drift >= C) {
    issues.push(
      makeIssue(
        ISSUE_CODES.MOMENTUM_SUPERLUMINAL,
        'error',
        'Centre-of-mass speed is at or above the speed of light.',
        'bodies',
        { details: { drift, speedOfLight: C } },
      ),
    );
  } else if (drift > C * DRIFT_FRACTION) {
    issues.push(
      makeIssue(
        ISSUE_CODES.MOMENTUM_DRIFT,
        'warning',
        'Net momentum implies a rapidly drifting centre of mass.',
        'bodies',
        { details: { drift, threshold: C * DRIFT_FRACTION } },
      ),
    );
  }
  return issues;
}
