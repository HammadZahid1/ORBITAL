import { resolveRootOptions, type RootFinderOptions } from './rootOptions';

/**
 * Finds a real root of a differentiable scalar function with Newton's method.
 *
 * Assumptions:
 * - `f` and `derivative` are finite-valued near the iterate.
 * - `initial` is finite and sufficiently close to a simple root; a zero or
 *   non-finite derivative stops the search and returns `null`.
 * - Converges when either `|f(x)|` or the size of the Newton step falls below
 *   `options.tolerance`.
 *
 * The functions are treated as pure probes; no state is retained between calls.
 */
export function newtonRoot(
  f: (x: number) => number,
  derivative: (x: number) => number,
  initial: number,
  options: RootFinderOptions = {},
): number | null {
  if (!Number.isFinite(initial)) return null;
  const { tolerance, maxIterations } = resolveRootOptions(options);

  let x = initial;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const fx = f(x);
    if (!Number.isFinite(x) || !Number.isFinite(fx)) return null;
    if (Math.abs(fx) <= tolerance) return x;

    const slope = derivative(x);
    if (!Number.isFinite(slope) || slope === 0) return null;

    const next = x - fx / slope;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - x) <= tolerance) return next;
    x = next;
  }

  return null;
}
