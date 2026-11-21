/**
 * Duration formatting with explicit multi-unit breakdowns. Unlike the legacy
 * `engine/numeric.formatDuration`, this module never rounds a whole duration
 * to a single coarse unit; it composes the most significant components.
 */
import { TIME_UNITS } from './conversions';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';

/** Options for {@link formatDuration}. */
export interface DurationOptions {
  /** Maximum number of components to show (1-5, default 3). */
  maxComponents?: number;
  /** Decimals used for the trailing seconds component (0-6, default 1). */
  fractionDigits?: number;
}

interface DurationPart {
  readonly factor: number;
  readonly label: string;
}

const COARSE_PARTS: readonly DurationPart[] = Object.freeze([
  { factor: TIME_UNITS.factors.year, label: 'yr' },
  { factor: TIME_UNITS.factors.day, label: 'd' },
  { factor: TIME_UNITS.factors.hour, label: 'h' },
  { factor: TIME_UNITS.factors.minute, label: 'm' },
]);

/** Options for {@link formatClock}. */
export interface ClockOptions {
  /** Append a three-digit millisecond field when true. */
  milliseconds?: boolean;
}

/**
 * Formats seconds as up to `maxComponents` significant components, e.g.
 * `1 d 1 h 1 m`. Lower-order components are dropped once the limit is reached.
 * Zero renders as `0 s`; negative values carry a leading minus sign;
 * non-finite values return `—`.
 */
export function formatDuration(seconds: number, options: DurationOptions = {}): string {
  const finite = finiteInput(seconds);
  if (finite === null) return INVALID_NUMBER;
  const maxComponents = sanitizeDigits(options.maxComponents, 3, 1, 5);
  const fractionDigits = sanitizeDigits(options.fractionDigits, 1, 0, 6);
  let remainder = Math.abs(finite);
  const parts: string[] = [];

  for (const part of COARSE_PARTS) {
    if (parts.length >= maxComponents) break;
    const amount = Math.floor(remainder / part.factor);
    if (amount >= 1) {
      parts.push(`${amount} ${part.label}`);
      const next = remainder - amount * part.factor;
      remainder = Math.abs(next) < 1e-6 * part.factor ? 0 : next;
    }
  }

  if (parts.length === 0 || (remainder > 0 && parts.length < maxComponents)) {
    parts.push(`${fixed(remainder, fractionDigits)} s`);
  }
  return `${finite < 0 ? '-' : ''}${parts.join(' ')}`;
}

/** Zero-pads a non-negative integer to at least two digits. */
function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * Formats seconds as `HH:MM:SS` (or `D d HH:MM:SS` for day-scale spans).
 * Milliseconds are appended only when requested. Negative and non-finite
 * inputs are handled without throwing.
 */
export function formatClock(seconds: number, options: ClockOptions = {}): string {
  const finite = finiteInput(seconds);
  if (finite === null) return INVALID_NUMBER;

  let total = Math.floor(Math.abs(finite));
  let milliseconds = 0;
  if (options.milliseconds === true) {
    milliseconds = Math.min(999, Math.floor((Math.abs(finite) - total) * 1000 + 1e-6));
    if (milliseconds >= 1000) {
      milliseconds = 0;
      total += 1;
    }
  }

  const day = TIME_UNITS.factors.day;
  const hour = TIME_UNITS.factors.hour;
  const minute = TIME_UNITS.factors.minute;
  const days = Math.floor(total / day);
  total %= day;
  const hours = Math.floor(total / hour);
  total %= hour;
  const minutes = Math.floor(total / minute);
  const secs = total % minute;

  const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
  const fraction = milliseconds > 0 ? `.${milliseconds.toString().padStart(3, '0')}` : '';
  const prefix = days > 0 ? `${days} d ` : '';
  return `${finite < 0 ? '-' : ''}${prefix}${time}${fraction}`;
}
