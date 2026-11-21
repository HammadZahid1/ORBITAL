/** Mass formatting in grams with SI prefixes and in astrophysical units. */
import { MASS_UNITS, convert } from './conversions';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatWithSiPrefix } from './siPrefix';
import { formatWithUnit } from './unitLabels';

/**
 * Formats kilograms by rescaling to grams first, so `1 kg` stays `1.00 kg`
 * while `1500 kg` becomes `1.50 Mg` (never `kkg`). Non-finite values return `—`.
 */
export function formatMass(kilograms: number, fractionDigits = 2): string {
  return formatWithSiPrefix(kilograms * 1000, 'g', sanitizeDigits(fractionDigits, 2, 0, 6));
}

/** Formats kilograms as solar masses using the shared mass table. */
export function formatSolarMasses(kilograms: number, fractionDigits = 3): string {
  const finite = finiteInput(kilograms);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 3, 0, 6);
  return formatWithUnit(
    fixed(convert(finite, MASS_UNITS, 'kilogram', 'solarMass'), digits),
    'solarMass',
  );
}

/** Formats kilograms as Earth masses using the shared mass table. */
export function formatEarthMasses(kilograms: number, fractionDigits = 3): string {
  const finite = finiteInput(kilograms);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 3, 0, 6);
  return formatWithUnit(
    fixed(convert(finite, MASS_UNITS, 'kilogram', 'earthMass'), digits),
    'earthMass',
  );
}
