import { finiteOr } from '../numeric';

/**
 * Computes a trailing (causal) moving average of a numeric series.
 *
 * Assumptions:
 * - `windowSize` is a positive integer; non-finite or sub-unit values become
 *   `1` and fractional values are floored.
 * - Non-finite samples are treated as `0` rather than propagating `NaN`.
 * - The output has the same length as the input. Until the window is full the
 *   average uses only the samples seen so far, so no future data is needed.
 */
export function movingAverage(values: readonly number[], windowSize: number): number[] {
  const requested = finiteOr(windowSize, 1);
  const window = Math.max(1, Math.floor(requested));
  const recent: number[] = [];
  const result: number[] = [];
  let sum = 0;

  for (const raw of values) {
    const sample = Number.isFinite(raw) ? raw : 0;
    recent.push(sample);
    sum += sample;

    if (recent.length > window) {
      const removed = recent.shift();
      if (removed !== undefined) sum -= removed;
    }

    result.push(finiteOr(sum / recent.length, 0));
  }

  return result;
}
