import { resolveRootOptions, type RootFinderOptions } from './rootOptions';

const GOLDEN_CONJUGATE = (Math.sqrt(5) - 1) / 2;

/**
 * Locates the minimiser of a unimodal scalar function on a closed interval.
 *
 * Assumptions:
 * - `f` has a single local minimum on the interval and returns finite values
 *   at every probed point.
 * - `lower` and `upper` are finite; reversed bounds are swapped.
 * - `options.tolerance` is the final bracket width and `options.maxIterations`
 *   caps the search; the current midpoint is returned after the cap.
 *
 * Returns `null` for invalid bounds or non-finite function evaluations.
 */
export function goldenSectionMinimum(
  f: (x: number) => number,
  lower: number,
  upper: number,
  options: RootFinderOptions = {},
): number | null {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;

  let a = lower;
  let b = upper;
  if (a > b) [a, b] = [b, a];

  const { tolerance, maxIterations } = resolveRootOptions(options);
  let c = b - GOLDEN_CONJUGATE * (b - a);
  let d = a + GOLDEN_CONJUGATE * (b - a);
  let fc = f(c);
  let fd = f(d);
  if (!Number.isFinite(c) || !Number.isFinite(d) || !Number.isFinite(fc) || !Number.isFinite(fd)) return null;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (b - a <= tolerance) break;

    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - GOLDEN_CONJUGATE * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + GOLDEN_CONJUGATE * (b - a);
      fd = f(d);
    }

    if (!Number.isFinite(c) || !Number.isFinite(d) || !Number.isFinite(fc) || !Number.isFinite(fd)) return null;
  }

  const midpoint = a + (b - a) / 2;
  return Number.isFinite(midpoint) ? midpoint : null;
}
