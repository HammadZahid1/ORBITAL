const DEFAULT_PERIOD = 2 * Math.PI;

/**
 * Wraps an angle into the half-open interval `[-period / 2, period / 2)`.
 *
 * Assumptions:
 * - `period` is finite and positive; otherwise `2π` is used.
 * - `angle` is finite; non-finite input returns `0`.
 * - With the default period, `π` maps to `-π`, so the upper bound is exclusive.
 *
 * This complements the existing private `[0, 2π)` helper in `scenarios/extra`
 * by providing a signed convention suitable for shortest angular differences.
 */
export function wrapAngle(angle: number, period = DEFAULT_PERIOD): number {
  if (!Number.isFinite(angle)) return 0;

  const safePeriod = Number.isFinite(period) && period > 0 ? period : DEFAULT_PERIOD;
  const half = safePeriod / 2;
  const wrapped = (((angle + half) % safePeriod) + safePeriod) % safePeriod - half;
  if (!Number.isFinite(wrapped)) return 0;
  return wrapped >= half ? -half : wrapped;
}
