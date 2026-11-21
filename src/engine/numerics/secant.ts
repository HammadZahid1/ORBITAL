import { resolveRootOptions, type RootFinderOptions } from './rootOptions';

/**
 * Finds a real root of a scalar function with the secant method.
 *
 * Assumptions:
 * - `f` is continuous near the root and finite at every evaluated point.
 * - `x0` and `x1` are finite and distinct in function value; a zero secant
 *   denominator stops the search and returns `null`.
 * - Converges when `|f(x)|` or the last step size is within `options.tolerance`.
 *
 * Unlike Newton's method this needs no derivative, but it does not bracket the
 * root, so convergence is not guaranteed for arbitrary starting guesses.
 */
export function secantRoot(
  f: (x: number) => number,
  x0: number,
  x1: number,
  options: RootFinderOptions = {},
): number | null {
  if (!Number.isFinite(x0) || !Number.isFinite(x1)) return null;
  const { tolerance, maxIterations } = resolveRootOptions(options);

  let previous = x0;
  let current = x1;
  let fPrevious = f(previous);
  let fCurrent = f(current);
  if (!Number.isFinite(fPrevious) || !Number.isFinite(fCurrent)) return null;
  if (Math.abs(fCurrent) <= tolerance) return current;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const denominator = fCurrent - fPrevious;
    if (!Number.isFinite(denominator) || denominator === 0) return null;

    const next = current - (fCurrent * (current - previous)) / denominator;
    if (!Number.isFinite(next)) return null;

    const fNext = f(next);
    if (!Number.isFinite(fNext)) return null;
    if (Math.abs(fNext) <= tolerance || Math.abs(next - current) <= tolerance) return next;

    previous = current;
    current = next;
    fPrevious = fCurrent;
    fCurrent = fNext;
  }

  return null;
}
