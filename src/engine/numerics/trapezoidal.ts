import { resolveSubdivisions } from './integrationOptions';

/**
 * Approximates a definite integral with the composite trapezoidal rule.
 *
 * Assumptions:
 * - `f` is finite-valued on the closed interval and `lower`/`upper` are finite.
 * - `subdivisions` is a positive integer; invalid values fall back to `128`
 *   (see {@link resolveSubdivisions}).
 * - Trapezoidal integration is exact only for polynomials of degree ≤ 1.
 *
 * Returns `null` if the bounds or any sampled value is non-finite.
 */
export function trapezoidalIntegral(
  f: (x: number) => number,
  lower: number,
  upper: number,
  subdivisions = 128,
): number | null {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;

  const count = resolveSubdivisions(subdivisions);
  const step = (upper - lower) / count;
  if (!Number.isFinite(step)) return null;

  const first = f(lower);
  const last = f(upper);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  let sum = (first + last) / 2;

  for (let i = 1; i < count; i += 1) {
    const x = lower + i * step;
    if (!Number.isFinite(x)) return null;
    const value = f(x);
    if (!Number.isFinite(value)) return null;
    sum += value;
    if (!Number.isFinite(sum)) return null;
  }

  const result = step * sum;
  return Number.isFinite(result) ? result : null;
}
