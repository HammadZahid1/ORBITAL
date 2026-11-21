import { finiteOr } from '../numeric';

/** Convergence controls shared by the scalar iterative root finders and golden-section search. */
export interface RootFinderOptions {
  /**
   * Positive residual (or bracket-width) tolerance.
   * Non-finite or non-positive values fall back to `1e-9`.
   */
  tolerance?: number;
  /**
   * Positive integer iteration cap.
   * Non-finite or non-positive values fall back to `100`.
   */
  maxIterations?: number;
}

/** Finite, validated root-finder settings produced by {@link resolveRootOptions}. */
export interface ResolvedRootOptions {
  /** Guaranteed finite and strictly greater than zero. */
  tolerance: number;
  /** Guaranteed finite integer greater than or equal to one. */
  maxIterations: number;
}

const DEFAULT_TOLERANCE = 1e-9;
const DEFAULT_MAX_ITERATIONS = 100;

/**
 * Normalises optional root-finder settings to finite, usable values.
 *
 * Assumptions:
 * - `options` may be omitted or contain `undefined` fields.
 * - Any non-finite, non-positive, or fractional iteration value is replaced by
 *   the documented default rather than propagating `NaN` into a solver.
 */
export function resolveRootOptions(options: RootFinderOptions = {}): ResolvedRootOptions {
  const tolerance = options.tolerance === undefined ? DEFAULT_TOLERANCE : finiteOr(options.tolerance, DEFAULT_TOLERANCE);
  const iterations = options.maxIterations === undefined
    ? DEFAULT_MAX_ITERATIONS
    : finiteOr(options.maxIterations, DEFAULT_MAX_ITERATIONS);

  return {
    tolerance: tolerance > 0 ? tolerance : DEFAULT_TOLERANCE,
    maxIterations: Math.max(1, Math.floor(iterations)),
  };
}
