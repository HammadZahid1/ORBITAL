/** Angle formatting in radians, degrees and degrees-minutes-seconds. */
import { ANGLE_UNITS, convert } from './conversions';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatWithUnit } from './unitLabels';

/** Angle output units. Radians are the input unit for every function here. */
export type AngleOutputUnit = 'deg' | 'rad';

/** Options for {@link formatAngle}. */
export interface AngleFormatOptions {
  /** `deg` (default) or `rad`. */
  unit?: AngleOutputUnit;
  /** Decimal places, clamped to 0-6 (default 1). */
  digits?: number;
}

/**
 * Formats a radian angle in degrees (`180.0°`) or radians (`3.142 rad`).
 * Angles are not wrapped; non-finite inputs return `—`.
 */
export function formatAngle(radians: number, options: AngleFormatOptions = {}): string {
  const finite = finiteInput(radians);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(options.digits, 1, 0, 6);
  if (options.unit === 'rad') {
    return formatWithUnit(fixed(finite, digits), 'radian');
  }
  const degrees = convert(finite, ANGLE_UNITS, 'radian', 'degree');
  return formatWithUnit(fixed(degrees, digits), 'degree');
}

/**
 * Formats radians as `D° M′ S.S″`, preserving the sign and carrying a rounded
 * 60-second overflow into minutes and degrees. Non-finite inputs return `—`.
 */
export function formatDegreesMinutesSeconds(radians: number, fractionDigits = 1): string {
  const finite = finiteInput(radians);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 1, 0, 6);
  const totalDegrees = convert(finite, ANGLE_UNITS, 'radian', 'degree');
  const negative = totalDegrees < 0;
  let remaining = Math.abs(totalDegrees);
  let degrees = Math.floor(remaining);
  remaining -= degrees;
  let minutes = Math.floor(remaining * 60);
  const seconds = (remaining * 60 - minutes) * 60;

  let secondsText = fixed(seconds, digits);
  if (Number(secondsText) >= 60) {
    secondsText = fixed(0, digits);
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes = 0;
    degrees += 1;
  }
  return `${negative ? '-' : ''}${degrees}° ${minutes}′ ${secondsText}″`;
}
