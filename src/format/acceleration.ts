/** Acceleration formatting in SI prefixes and standard-gravity multiples. */
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatWithSiPrefix } from './siPrefix';
import { unitSymbol } from './unitLabels';

/** Standard gravity, m/s² (exact convention used for `g₀` comparisons). */
export const STANDARD_GRAVITY = 9.80665;

/**
 * Formats metres per second squared with an SI prefix, for example
 * `9.81 m/s²` or `1.00 km/s²`. Non-finite values return `—`.
 */
export function formatAcceleration(metresPerSecondSquared: number, fractionDigits = 2): string {
  return formatWithSiPrefix(
    metresPerSecondSquared,
    unitSymbol('acceleration'),
    sanitizeDigits(fractionDigits, 2, 0, 6),
  );
}

/** Formats an acceleration as a multiple of standard gravity, e.g. `1.000 g₀`. */
export function formatStandardGravity(
  metresPerSecondSquared: number,
  fractionDigits = 3,
): string {
  const finite = finiteInput(metresPerSecondSquared);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 3, 0, 6);
  return `${fixed(finite / STANDARD_GRAVITY, digits)} g₀`;
}
