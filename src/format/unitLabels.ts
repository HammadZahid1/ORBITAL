/** Central registry of display symbols used by the format modules. */
import { INVALID_NUMBER } from './internal';

/** Physical quantities that have a canonical display symbol. */
export type UnitKey =
  | 'metre'
  | 'gram'
  | 'kilogram'
  | 'second'
  | 'velocity'
  | 'acceleration'
  | 'radian'
  | 'degree'
  | 'kelvin'
  | 'celsius'
  | 'fahrenheit'
  | 'astronomicalUnit'
  | 'lightYear'
  | 'parsec'
  | 'solarMass'
  | 'earthMass'
  | 'newton'
  | 'joule'
  | 'pascal'
  | 'watt'
  | 'hertz'
  | 'dimensionless';

/** A unit symbol and whether it is separated from the numeric text by a space. */
export interface UnitDescriptor {
  readonly symbol: string;
  readonly separator: ' ' | '';
}

/**
 * Frozen symbol registry. The bare angular degree attaches directly while SI
 * and named units (including °C and °F) use a space. Keeping symbols here
 * prevents the individual format modules from drifting apart in their labels.
 */
export const UNIT_REGISTRY: Readonly<Record<UnitKey, UnitDescriptor>> = Object.freeze({
  metre: { symbol: 'm', separator: ' ' },
  gram: { symbol: 'g', separator: ' ' },
  kilogram: { symbol: 'kg', separator: ' ' },
  second: { symbol: 's', separator: ' ' },
  velocity: { symbol: 'm/s', separator: ' ' },
  acceleration: { symbol: 'm/s²', separator: ' ' },
  radian: { symbol: 'rad', separator: ' ' },
  degree: { symbol: '°', separator: '' },
  kelvin: { symbol: 'K', separator: ' ' },
  celsius: { symbol: '°C', separator: ' ' },
  fahrenheit: { symbol: '°F', separator: ' ' },
  astronomicalUnit: { symbol: 'AU', separator: ' ' },
  lightYear: { symbol: 'ly', separator: ' ' },
  parsec: { symbol: 'pc', separator: ' ' },
  solarMass: { symbol: 'M☉', separator: ' ' },
  earthMass: { symbol: 'M⊕', separator: ' ' },
  newton: { symbol: 'N', separator: ' ' },
  joule: { symbol: 'J', separator: ' ' },
  pascal: { symbol: 'Pa', separator: ' ' },
  watt: { symbol: 'W', separator: ' ' },
  hertz: { symbol: 'Hz', separator: ' ' },
  dimensionless: { symbol: '', separator: '' },
});

/** Type guard for safe lookup of a registry key from untrusted text. */
export function isUnitKey(key: string): key is UnitKey {
  return Object.prototype.hasOwnProperty.call(UNIT_REGISTRY, key);
}

/** Returns the registered symbol, or an empty string for an unknown key. */
export function unitSymbol(key: UnitKey): string {
  return UNIT_REGISTRY[key]?.symbol ?? '';
}

/**
 * Appends a registered unit symbol using its canonical separator. Invalid
 * numeric text (`—`) is returned unchanged so error markers stay unambiguous.
 */
export function formatWithUnit(text: string, key: UnitKey): string {
  const descriptor = UNIT_REGISTRY[key];
  if (!descriptor?.symbol || text === INVALID_NUMBER) return text;
  return `${text}${descriptor.separator}${descriptor.symbol}`;
}
