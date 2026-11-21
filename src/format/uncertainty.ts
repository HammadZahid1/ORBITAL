/** Measurement uncertainty formatting with uncertainty-driven precision. */
import { clamp } from '../engine/numeric';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';

/**
 * Formats `value ± uncertainty`, choosing the number of decimals from the
 * uncertainty magnitude (`0.05` -> two decimals, `2` -> none). An optional
 * unit label is appended once to the whole expression. Zero uncertainty uses
 * two decimals; non-finite inputs return `—`.
 */
export function formatUncertainty(value: number, uncertainty: number, unit = ''): string {
  const centre = finiteInput(value);
  const spread = finiteInput(uncertainty);
  if (centre === null || spread === null) return INVALID_NUMBER;
  const absolute = Math.abs(spread);
  const log10 = Math.log10(absolute);
  const digits =
    absolute === 0
      ? 2
      : Math.round(clamp(Number.isFinite(log10) ? -Math.floor(log10) : 0, 0, 9));
  const suffix = unit ? ` ${unit}` : '';
  return `${fixed(centre, digits)} ± ${fixed(absolute, digits)}${suffix}`;
}

/**
 * Formats the relative uncertainty as `±N%`. A zero or non-finite central
 * value returns `—`; digits are clamped to 0-6.
 */
export function formatRelativeUncertainty(
  value: number,
  uncertainty: number,
  fractionDigits = 1,
): string {
  const centre = finiteInput(value);
  const spread = finiteInput(uncertainty);
  if (centre === null || spread === null || centre === 0) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 1, 0, 6);
  const relative = (Math.abs(spread) / Math.abs(centre)) * 100;
  return `±${fixed(relative, digits)}%`;
}
