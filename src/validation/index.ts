/** Public validation API for universes, scenarios and untrusted imports. */

export * from './severity';
export * from './types';
export * from './guards';
export * from './issues';
export * from './report';
export * from './schemaVersion';
export * from './requiredFields';
export * from './finiteState';
export * from './physicalBounds';
export * from './duplicateIds';
export * from './hierarchy';
export * from './orbitalParameters';
export * from './energySanity';
export * from './momentumSanity';
export * from './collisionOverlap';
export * from './scaleReasonableness';
export * from './integratorCompatibility';
export * from './settingsValidation';
export * from './scenarioMetadata';
export * from './importSafety';
export * from './repair';
export * from './pipeline';

import type { Universe } from '../types/celestial';
import { validateUniverseInput } from './pipeline';
import type { ValidationOptions, ValidationReport } from './types';

/** Convenience wrapper accepting either a typed universe or unknown input. */
export function validateUniverse(
  universe: Universe | unknown,
  options?: ValidationOptions,
): ValidationReport {
  return validateUniverseInput(universe, options);
}
