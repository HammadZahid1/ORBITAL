/** Locale-independent numeric formatting using stable en-US conventions. */
import { INVALID_NUMBER, finiteInput, fixed, groupInteger, sanitizeDigits } from './internal';

/** Options for {@link formatNumber}. */
export interface NumberFormatOptions {
  /** Minimum decimal places to retain (0-12, default 0). */
  minimumFractionDigits?: number;
  /** Maximum decimal places (0-12, default 3). */
  maximumFractionDigits?: number;
  /** Insert thousands separators; defaults to true. */
  useGrouping?: boolean;
}

/** Trims fractional zeros while keeping at least `minimum` decimals. */
function trimToMinimum(text: string, minimum: number): string {
  const dot = text.indexOf('.');
  if (dot < 0) return text;
  let end = text.length;
  while (end - dot - 1 > minimum && text[end - 1] === '0') end -= 1;
  return end - dot === 1 ? text.slice(0, dot) : text.slice(0, end);
}

/**
 * Formats a finite number with a decimal point, optional grouping and a
 * stable decimal count. No `Intl` or host-locale APIs are used, so output is
 * identical across environments. Non-finite values return `—`.
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const finite = finiteInput(value);
  if (finite === null) return INVALID_NUMBER;
  const minimum = sanitizeDigits(options.minimumFractionDigits, 0, 0, 12);
  let maximum = sanitizeDigits(options.maximumFractionDigits, 3, 0, 12);
  if (maximum < minimum) maximum = minimum;

  const text = trimToMinimum(fixed(finite, maximum), minimum);
  if (options.useGrouping === false) return text;
  const dot = text.indexOf('.');
  const integer = dot < 0 ? text : text.slice(0, dot);
  const fraction = dot < 0 ? '' : text.slice(dot);
  return `${groupInteger(integer)}${fraction}`;
}

/**
 * Parses text produced by this module (or plain numeric text) back into a
 * finite number. Grouping commas and surrounding whitespace are ignored;
 * invalid or non-finite input returns `0`.
 */
export function parseFormattedNumber(text: string): number {
  if (typeof text !== 'string') return 0;
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === INVALID_NUMBER) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
