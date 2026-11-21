import { resolveSubdivisions } from './integrationOptions';

/**
 * Approximates a definite integral with composite Simpson's rule.
 *
 * Assumptions:
 * - `f` is finite-valued on the closed interval and `lower`/`upper` are finite.
 * - `subdivisions` is a positive integer; odd counts are rounded up to the
 *   next even count because Simpson's rule requires paired panels.
 * - Simpson's rule is exact for polynomials of degree ≤ 3.
 *
 * Returns `null` if the bounds or any sampled value is non-finite.
 */
export function simpsonIntegral(
  f: (x: number) => number,
  lower: number,
  upper: number,
  subdivisions = 128,
): number | null {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;

  const count = resolveSubdivisions(subdivisions, true);
  const step = (upper - lower) / count;
  if (!Number.isFinite(step)) return null;

  const first = f(lower);
  const last = f(upper);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  let sum = first + last;

  for (let i = 1; i < count; i += 1) {
    const x = lower + i * step;
    if (!Number.isFinite(x)) return null;
    const value = f(x);
    if (!Number.isFinite(value)) return null;
    sum += (i % 2 === 1 ? 4 : 2) * value;
    if (!Number.isFinite(sum)) return null;
  }

  const result = (step * sum) / 3;
  return Number.isFinite(result) ? result : null;
}
