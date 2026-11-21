import { clamp, finiteOr } from '../numeric';

/**
 * Evaluates a cubic Hermite spline segment from endpoints and endpoint slopes.
 *
 * Assumptions:
 * - `m0` and `m1` are derivatives with respect to the normalised parameter
 *   `t`, not with respect to time or distance.
 * - `t` is clamped to `[0, 1]`: the function interpolates, never extrapolates.
 * - Non-finite values are replaced by `0`, and an overflowing result falls
 *   back to `0` to keep the output finite.
 */
export function cubicHermite(p0: number, m0: number, p1: number, m1: number, t: number): number {
  const start = finiteOr(p0, 0);
  const startSlope = finiteOr(m0, 0);
  const end = finiteOr(p1, 0);
  const endSlope = finiteOr(m1, 0);
  const u = clamp(finiteOr(t, 0), 0, 1);

  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  return finiteOr(h00 * start + h10 * startSlope + h01 * end + h11 * endSlope, 0);
}
