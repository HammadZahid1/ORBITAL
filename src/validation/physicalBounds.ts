import { isFiniteNumber } from './guards';
import { bodyPath, makeIssue, setNumberRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Positive bounds plus order-of-magnitude plausibility for mass and radius. */

const MIN_MASS = 1e-6;
const MAX_MASS = 1e42;
const MIN_RADIUS = 1e-4;
const MAX_RADIUS = 1e14;
const MAX_DENSITY = 1e20;

export function checkPhysicalBounds(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  universe.bodies.forEach((body, index) => {
    const { mass, radius } = body.physical;
    const massPath = `${bodyPath(index, 'physical')}.mass`;
    const radiusPath = `${bodyPath(index, 'physical')}.radius`;

    if (isFiniteNumber(mass)) {
      if (mass <= 0) {
        issues.push(
          makeIssue(ISSUE_CODES.MASS_OUT_OF_RANGE, 'error', 'Mass must be positive.', massPath, {
            bodyId: body.id,
            repair: setNumberRepair(massPath, 1, 'Set mass to 1 kg.'),
            details: { value: mass },
          }),
        );
      } else if (mass < MIN_MASS) {
        issues.push(
          makeIssue(ISSUE_CODES.MASS_OUT_OF_RANGE, 'warning', 'Mass is implausibly small.', massPath, {
            bodyId: body.id,
            repair: setNumberRepair(massPath, MIN_MASS, `Clamp mass to ${MIN_MASS} kg.`),
          }),
        );
      } else if (mass > MAX_MASS) {
        issues.push(
          makeIssue(ISSUE_CODES.MASS_OUT_OF_RANGE, 'warning', 'Mass exceeds plausible bounds.', massPath, {
            bodyId: body.id,
            repair: setNumberRepair(massPath, MAX_MASS, `Clamp mass to ${MAX_MASS} kg.`),
          }),
        );
      }
    }

    if (isFiniteNumber(radius)) {
      if (radius <= 0) {
        issues.push(
          makeIssue(ISSUE_CODES.RADIUS_OUT_OF_RANGE, 'error', 'Radius must be positive.', radiusPath, {
            bodyId: body.id,
            repair: setNumberRepair(radiusPath, 1, 'Set radius to 1 m.'),
            details: { value: radius },
          }),
        );
      } else if (radius < MIN_RADIUS) {
        issues.push(
          makeIssue(ISSUE_CODES.RADIUS_OUT_OF_RANGE, 'warning', 'Radius is implausibly small.', radiusPath, {
            bodyId: body.id,
            repair: setNumberRepair(radiusPath, MIN_RADIUS, `Clamp radius to ${MIN_RADIUS} m.`),
          }),
        );
      } else if (radius > MAX_RADIUS) {
        issues.push(
          makeIssue(ISSUE_CODES.RADIUS_OUT_OF_RANGE, 'warning', 'Radius exceeds plausible bounds.', radiusPath, {
            bodyId: body.id,
            repair: setNumberRepair(radiusPath, MAX_RADIUS, `Clamp radius to ${MAX_RADIUS} m.`),
          }),
        );
      }
    }

    if (isFiniteNumber(mass) && isFiniteNumber(radius) && mass > 0 && radius > 0) {
      const density = mass / ((4 / 3) * Math.PI * radius ** 3);
      if (isFiniteNumber(density) && density > MAX_DENSITY) {
        issues.push(
          makeIssue(
            ISSUE_CODES.DENSITY_EXTREME,
            'warning',
            'Mean density exceeds nuclear density; check mass and radius.',
            bodyPath(index),
            { bodyId: body.id, details: { density } },
          ),
        );
      }
    }
  });
  return issues;
}
