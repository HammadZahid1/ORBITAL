import { clamp, finiteOr } from '../numeric';

/**
 * Applies single-parameter exponential smoothing to a numeric series.
 *
 * Assumptions:
 * - `alpha` is clamped to `[0, 1]`; non-finite values become `0` (no update).
 * - `initial` defaults to the first sample (or `0` for an empty series) and is
 *   sanitised to a finite value.
 * - Non-finite samples are treated as `0`; the output length matches the input.
 *
 * The recurrence `sᵢ = alpha * xᵢ + (1 - alpha) * sᵢ₋₁` is causal and pure.
 */
export function exponentialSmoothing(values: readonly number[], alpha: number, initial?: number): number[] {
  const smoothing = clamp(finiteOr(alpha, 0), 0, 1);
  let state = initial === undefined
    ? (values.length > 0 ? finiteOr(values[0], 0) : 0)
    : finiteOr(initial, 0);

  const result: number[] = [];
  for (const raw of values) {
    const sample = Number.isFinite(raw) ? raw : 0;
    state = smoothing * sample + (1 - smoothing) * state;
    if (!Number.isFinite(state)) state = 0;
    result.push(state);
  }
  return result;
}
