/** Distance formatting in SI units and astronomical units. */
import { LENGTH_UNITS, convert, type LengthUnit } from './conversions';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatWithSiPrefix } from './siPrefix';
import { formatWithUnit, unitSymbol, type UnitKey } from './unitLabels';

/** Supported astronomical distance labels. */
export type AstronomicalDistanceUnit = 'AU' | 'ly' | 'pc';

const ASTRONOMICAL: Readonly<
  Record<AstronomicalDistanceUnit, { readonly source: LengthUnit; readonly label: UnitKey }>
> = Object.freeze({
  AU: { source: 'astronomicalUnit', label: 'astronomicalUnit' },
  ly: { source: 'lightYear', label: 'lightYear' },
  pc: { source: 'parsec', label: 'parsec' },
});

/**
 * Formats metres with an automatic SI prefix, for example `1.50 km` or
 * `3.84 Mm`. Non-finite values return the invalid marker.
 */
export function formatDistance(metres: number, fractionDigits = 2): string {
  return formatWithSiPrefix(metres, unitSymbol('metre'), sanitizeDigits(fractionDigits, 2, 0, 6));
}

/**
 * Formats metres in AU, light-years or parsecs using the shared conversion
 * table. Unknown unit labels fall back to AU; non-finite inputs return `—`.
 */
export function formatAstronomicalDistance(
  metres: number,
  unit: AstronomicalDistanceUnit = 'AU',
  fractionDigits = 3,
): string {
  const finite = finiteInput(metres);
  if (finite === null) return INVALID_NUMBER;
  const spec = ASTRONOMICAL[unit] ?? ASTRONOMICAL.AU;
  const digits = sanitizeDigits(fractionDigits, 3, 0, 6);
  const value = convert(finite, LENGTH_UNITS, 'metre', spec.source);
  return formatWithUnit(fixed(value, digits), spec.label);
}
