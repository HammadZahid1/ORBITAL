import { finiteOr } from '../numeric';

/**
 * Compares two numbers with combined relative and absolute tolerances.
 *
 * Assumptions:
 * - Tolerances are non-negative and finite; invalid values fall back to
 *   `1e-9` (relative) and `1e-12` (absolute).
 * - `|a - b| <= max(absoluteTolerance, relativeTolerance * max(|a|, |b|))`.
 * - Non-finite inputs use strict equality: equal infinities compare equal,
 *   while `NaN` is never equal to anything, including itself.
 */
export function nearlyEqual(
  a: number,
  b: number,
  relativeTolerance = 1e-9,
  absoluteTolerance = 1e-12,
): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;

  const relative = Math.max(0, finiteOr(relativeTolerance, 1e-9));
  const absolute = Math.max(0, finiteOr(absoluteTolerance, 1e-12));
  const difference = Math.abs(a - b);
  if (!Number.isFinite(difference)) return false;

  return difference <= Math.max(absolute, relative * Math.max(Math.abs(a), Math.abs(b)));
}
