import { finiteOr } from '../numeric';

const DEFAULT_SUBDIVISIONS = 128;

/**
 * Normalises the subdivision count used by composite quadrature rules.
 *
 * Assumptions:
 * - The caller wants at least one panel; non-finite or sub-unit values fall
 *   back to `128`, and fractional values are floored.
 * - When `requireEven` is true (Simpson's rule), an odd count is increased by
 *   one instead of being rejected.
 */
export function resolveSubdivisions(subdivisions: number | undefined, requireEven = false): number {
  const requested = subdivisions === undefined ? DEFAULT_SUBDIVISIONS : finiteOr(subdivisions, DEFAULT_SUBDIVISIONS);
  let count = Math.max(1, Math.floor(requested));
  if (requireEven && count % 2 === 1) count += 1;
  return count;
}
