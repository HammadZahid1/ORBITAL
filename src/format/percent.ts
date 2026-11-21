/** Percentage and percent-change formatting. */
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';

/** Formats a fraction as a percentage, e.g. `0.125` -> `12.5%`. */
export function formatPercent(fraction: number, fractionDigits = 1): string {
  const finite = finiteInput(fraction);
  if (finite === null) return INVALID_NUMBER;
  return `${fixed(finite * 100, sanitizeDigits(fractionDigits, 1, 0, 6))}%`;
}

/**
 * Formats the relative change from `from` to `to` with an explicit sign for
 * increases. A zero or non-finite baseline returns `—` to avoid division by
 * zero or meaningless ratios.
 */
export function formatPercentChange(from: number, to: number, fractionDigits = 1): string {
  const baseline = finiteInput(from);
  const target = finiteInput(to);
  if (baseline === null || target === null || baseline === 0) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 1, 0, 6);
  const change = ((target - baseline) / Math.abs(baseline)) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${fixed(change, digits)}%`;
}
