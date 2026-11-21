import { clamp, finiteOr } from '../numeric';

/**
 * Clamps an angle to an inclusive interval without wrapping around the circle.
 *
 * Assumptions:
 * - Bounds are finite; non-finite bounds fall back to `[-π, π]`.
 * - Reversed bounds are swapped so the interval is always ordered.
 * - Non-finite angles become `0` before clamping.
 * - Use {@link wrapAngle} when modular (shortest-path) behaviour is wanted.
 */
export function clampAngle(angle: number, min = -Math.PI, max = Math.PI): number {
  let lower = finiteOr(min, -Math.PI);
  let upper = finiteOr(max, Math.PI);
  if (lower > upper) [lower, upper] = [upper, lower];
  return clamp(finiteOr(angle, 0), lower, upper);
}
