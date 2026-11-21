/** Velocity formatting in SI prefixes, road units and fractions of light speed. */
import { SPEED_UNITS, convert } from './conversions';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatWithSiPrefix } from './siPrefix';
import { unitSymbol } from './unitLabels';

/**
 * Formats metres per second with an automatic SI prefix, for example
 * `30.00 km/s` for 30,000 m/s. Non-finite values return `—`.
 */
export function formatVelocity(metresPerSecond: number, fractionDigits = 2): string {
  return formatWithSiPrefix(
    metresPerSecond,
    unitSymbol('velocity'),
    sanitizeDigits(fractionDigits, 2, 0, 6),
  );
}

/** Formats a speed as a fraction of the speed of light, e.g. `0.5000 c`. */
export function formatSpeedOfLightFraction(metresPerSecond: number, fractionDigits = 4): string {
  const finite = finiteInput(metresPerSecond);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 4, 0, 6);
  const ratio = convert(finite, SPEED_UNITS, 'metrePerSecond', 'speedOfLight');
  return `${fixed(ratio, digits)} c`;
}

/** Formats metres per second as kilometres per hour using the speed table. */
export function formatKilometresPerHour(metresPerSecond: number, fractionDigits = 1): string {
  const finite = finiteInput(metresPerSecond);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 1, 0, 6);
  const value = convert(finite, SPEED_UNITS, 'metrePerSecond', 'kilometrePerHour');
  return `${fixed(value, digits)} km/h`;
}
