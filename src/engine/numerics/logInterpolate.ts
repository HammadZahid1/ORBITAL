import { clamp } from '../numeric';

/**
 * Interpolates between two positive values in log space (geometric interpolation).
 *
 * Assumptions:
 * - `a` and `b` are finite and strictly positive; non-positive or non-finite
 *   endpoints return `0`.
 * - `t` is clamped to `[0, 1]`; `t = 0` returns `a`, `t = 1` returns `b`.
 * - The exponential result falls back to `0` if it cannot be represented.
 */
export function logInterpolate(a: number, b: number, t: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return 0;

  const factor = clamp(Number.isFinite(t) ? t : 0, 0, 1);
  const logA = Math.log(a);
  const logB = Math.log(b);
  const result = Math.exp(logA + (logB - logA) * factor);
  return Number.isFinite(result) ? result : 0;
}
