/**
 * Counts significant decimal digits in a number's shortest round-trip form.
 *
 * Assumptions:
 * - Uses `toExponential()` so trailing zeros in an integer (`1000`) are not
 *   counted, while decimal precision (`0.00120` -> `1.2e-3` -> 2) is.
 * - Zero and non-finite values have `0` significant digits.
 *
 * The result is a non-negative integer and the input is never modified.
 */
export function countSignificantDigits(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const mantissa = Math.abs(value).toExponential().split('e')[0];
  return mantissa.replace('.', '').length;
}
