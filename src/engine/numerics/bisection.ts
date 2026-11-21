import { resolveRootOptions, type RootFinderOptions } from './rootOptions';

/**
 * Finds a real root of a continuous scalar function by interval bisection.
 *
 * Assumptions:
 * - `f` is continuous on the bracket and returns finite values at every probe.
 * - `lower` and `upper` are finite; reversed bounds are swapped for convenience.
 * - A root is bracketed (`f(lower)` and `f(upper)` have opposite signs, or one
 *   endpoint is already a root). Unbracketed functions return `null`.
 * - `options.tolerance` bounds both the bracket width and `|f(x)|`.
 *
 * Returns the converged estimate, or `null` when the bracket is invalid or a
 * function evaluation is non-finite. Inputs are never mutated.
 */
export function bisectRoot(
  f: (x: number) => number,
  lower: number,
  upper: number,
  options: RootFinderOptions = {},
): number | null {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;

  let a = lower;
  let b = upper;
  if (a > b) [a, b] = [b, a];

  let fa = f(a);
  let fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
  if (fa === 0) return a;
  if (fb === 0) return b;
  if ((fa > 0) === (fb > 0)) return null;

  const { tolerance, maxIterations } = resolveRootOptions(options);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const midpoint = a + (b - a) / 2;
    if (!Number.isFinite(midpoint)) return null;

    const fm = f(midpoint);
    if (!Number.isFinite(fm)) return null;
    if (fm === 0 || b - a <= tolerance) return midpoint;

    if ((fm > 0) === (fa > 0)) {
      a = midpoint;
      fa = fm;
    } else {
      b = midpoint;
      fb = fm;
    }
  }

  return null;
}
