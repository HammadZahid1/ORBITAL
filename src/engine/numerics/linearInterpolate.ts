import { finiteOr } from '../numeric';

/**
 * Linearly interpolates (or extrapolates) between two scalar values.
 *
 * Assumptions:
 * - `t = 0` returns `a`, `t = 1` returns `b`; values outside `[0, 1]`
 *   intentionally extrapolate.
 * - Non-finite inputs are replaced by `0` for `a`/`b`/`t` as appropriate.
 * - If the arithmetic overflows, `0` is returned so the result stays finite.
 *
 * This is the scalar counterpart of the existing `lerp3` vector helper.
 */
export function linearInterpolate(a: number, b: number, t: number): number {
  const start = finiteOr(a, 0);
  const end = finiteOr(b, 0);
  const factor = finiteOr(t, 0);
  const value = start * (1 - factor) + end * factor;
  return finiteOr(value, 0);
}
