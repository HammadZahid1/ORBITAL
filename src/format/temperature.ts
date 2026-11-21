/** Temperature formatting with an absolute-zero guard. */
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatWithUnit, type UnitKey } from './unitLabels';

/** Supported temperature scales; Kelvin is the input unit. */
export type TemperatureUnit = 'K' | 'C' | 'F';

const UNIT_KEYS: Readonly<Record<TemperatureUnit, UnitKey>> = Object.freeze({
  K: 'kelvin',
  C: 'celsius',
  F: 'fahrenheit',
});

/** Converts Kelvin to Celsius, clamping inputs below absolute zero to 0 K. */
export function kelvinToCelsius(kelvin: number): number {
  const finite = finiteInput(kelvin);
  if (finite === null) return 0;
  return Math.max(0, finite) - 273.15;
}

/** Converts Kelvin to Fahrenheit via the clamped Celsius value. */
export function kelvinToFahrenheit(kelvin: number): number {
  return kelvinToCelsius(kelvin) * (9 / 5) + 32;
}

/**
 * Formats a Kelvin temperature as `300.0 K`, `26.9 °C` or `80.3 °F`.
 * Digits are clamped to 0-6; sub-absolute-zero inputs are clamped to 0 K;
 * non-finite inputs return `—`.
 */
export function formatTemperature(
  kelvin: number,
  options: { unit?: TemperatureUnit; digits?: number } = {},
): string {
  const finite = finiteInput(kelvin);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(options.digits, 1, 0, 6);
  const unit = options.unit === 'C' || options.unit === 'F' ? options.unit : 'K';
  const value =
    unit === 'C' ? kelvinToCelsius(finite) : unit === 'F' ? kelvinToFahrenheit(finite) : Math.max(0, finite);
  return formatWithUnit(fixed(value, digits), UNIT_KEYS[unit]);
}
