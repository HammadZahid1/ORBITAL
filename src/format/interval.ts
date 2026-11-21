/** Interval formatting with optional shared SI scaling. */
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { siPrefixFor } from './siPrefix';

/**
 * Formats a closed interval as `[low, high]`, normalising reversed endpoints.
 * Non-finite endpoints return `—`; digits are clamped to 0-6.
 */
export function formatInterval(minimum: number, maximum: number, fractionDigits = 2): string {
  const first = finiteInput(minimum);
  const second = finiteInput(maximum);
  if (first === null || second === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 2, 0, 6);
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  return `[${fixed(low, digits)}, ${fixed(high, digits)}]`;
}

/**
 * Formats a range as `low–high unit` with both endpoints scaled by the same SI
 * prefix, chosen from the larger magnitude. Reversed endpoints are normalised;
 * non-finite endpoints return `—`.
 */
export function formatIntervalWithUnit(
  minimum: number,
  maximum: number,
  unit = '',
  fractionDigits = 2,
): string {
  const first = finiteInput(minimum);
  const second = finiteInput(maximum);
  if (first === null || second === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 2, 0, 6);
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  const prefix = siPrefixFor(Math.max(Math.abs(low), Math.abs(high)));
  const factor = 10 ** prefix.exponent;
  const label = `${prefix.symbol}${unit}`;
  const text = `${fixed(low / factor, digits)}–${fixed(high / factor, digits)}`;
  return label ? `${text} ${label}` : text;
}
