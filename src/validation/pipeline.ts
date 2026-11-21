import { makeIssue } from './issues';
import { checkCollisionOverlap } from './collisionOverlap';
import { checkDuplicateIds } from './duplicateIds';
import { checkEnergySanity } from './energySanity';
import { checkFiniteState } from './finiteState';
import { checkHierarchy } from './hierarchy';
import { checkIntegratorCompatibility } from './integratorCompatibility';
import { checkMomentumSanity } from './momentumSanity';
import { checkOrbitalParameters } from './orbitalParameters';
import { checkPhysicalBounds } from './physicalBounds';
import { checkRequiredFields } from './requiredFields';
import { checkScaleReasonableness } from './scaleReasonableness';
import { checkSchemaVersion } from './schemaVersion';
import { checkUniverseSettings } from './settingsValidation';
import { createReport } from './report';
import { ISSUE_CODES, resolveOptions } from './types';
import type { ValidationIssue, ValidationOptions, ValidationReport } from './types';
import { isUniverseLike } from './guards';
import type { Universe } from '../types/celestial';

/** Runs every universe-level check in a deterministic order. */

export function runUniverseChecks(
  universe: Universe,
  options: ValidationOptions = {},
): ValidationIssue[] {
  const resolved = resolveOptions(options);
  return [
    ...checkFiniteState(universe),
    ...checkPhysicalBounds(universe),
    ...checkDuplicateIds(universe),
    ...checkHierarchy(universe),
    ...checkOrbitalParameters(universe),
    ...checkEnergySanity(universe),
    ...checkMomentumSanity(universe),
    ...checkCollisionOverlap(universe, resolved.maxOverlapPairs),
    ...checkScaleReasonableness(universe),
    ...checkIntegratorCompatibility(universe),
    ...checkUniverseSettings(universe.settings),
  ];
}

/**
 * Validates any candidate universe. Malformed shapes are reported by the
 * required-fields check before the physics checks run.
 */
export function validateUniverseInput(value: unknown, options?: ValidationOptions): ValidationReport {
  const resolved = resolveOptions(options);
  const shapeIssues = checkRequiredFields(value);
  if (!isUniverseLike(value)) return createReport(shapeIssues);

  const issues: ValidationIssue[] = [...shapeIssues, ...runUniverseChecks(value, resolved)];
  if (Object.prototype.hasOwnProperty.call(value, 'version')) {
    issues.push(...checkSchemaVersion(value, resolved.expectedSchemaVersion));
  }
  if (value.bodies.length === 0) {
    issues.push(
      makeIssue(ISSUE_CODES.UNIVERSE_EMPTY, 'info', 'Universe contains no bodies.', 'bodies'),
    );
  }
  return createReport(issues);
}
