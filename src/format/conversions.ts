/**
 * Frozen unit conversion tables expressed as multipliers relative to a base
 * unit. Physical constants are imported from the engine so there is a single
 * source of truth; no table entry is recomputed elsewhere in the formatter.
 */
import { AU, C, DAY, EARTH_MASS, SOLAR_MASS, YEAR } from '../engine/numeric';

/** A conversion table whose factors convert a unit into the table's base unit. */
export interface UnitTable<Unit extends string> {
  readonly base: Unit;
  readonly factors: Readonly<Record<Unit, number>>;
}

export type LengthUnit = 'metre' | 'kilometre' | 'astronomicalUnit' | 'lightYear' | 'parsec';
export type MassUnit = 'kilogram' | 'gram' | 'tonne' | 'solarMass' | 'earthMass';
export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'year';
export type SpeedUnit = 'metrePerSecond' | 'kilometrePerHour' | 'knot' | 'speedOfLight';
export type AngleUnitKey = 'radian' | 'degree' | 'arcminute' | 'arcsecond';

export const LENGTH_UNITS: UnitTable<LengthUnit> = Object.freeze({
  base: 'metre',
  factors: Object.freeze({
    metre: 1,
    kilometre: 1e3,
    astronomicalUnit: AU,
    lightYear: C * YEAR,
    parsec: (180 * 3600 * AU) / Math.PI,
  }),
});

export const MASS_UNITS: UnitTable<MassUnit> = Object.freeze({
  base: 'kilogram',
  factors: Object.freeze({
    kilogram: 1,
    gram: 1e-3,
    tonne: 1e3,
    solarMass: SOLAR_MASS,
    earthMass: EARTH_MASS,
  }),
});

export const TIME_UNITS: UnitTable<TimeUnit> = Object.freeze({
  base: 'second',
  factors: Object.freeze({
    second: 1,
    minute: 60,
    hour: 3600,
    day: DAY,
    year: YEAR,
  }),
});

export const SPEED_UNITS: UnitTable<SpeedUnit> = Object.freeze({
  base: 'metrePerSecond',
  factors: Object.freeze({
    metrePerSecond: 1,
    kilometrePerHour: 1 / 3.6,
    knot: 1852 / 3600,
    speedOfLight: C,
  }),
});

export const ANGLE_UNITS: UnitTable<AngleUnitKey> = Object.freeze({
  base: 'radian',
  factors: Object.freeze({
    radian: 1,
    degree: Math.PI / 180,
    arcminute: Math.PI / (180 * 60),
    arcsecond: Math.PI / (180 * 3600),
  }),
});

/** Registry of every conversion table for discoverability by callers. */
export const UNIT_CONVERSION_TABLES = Object.freeze({
  length: LENGTH_UNITS,
  mass: MASS_UNITS,
  time: TIME_UNITS,
  speed: SPEED_UNITS,
  angle: ANGLE_UNITS,
});

/**
 * Converts `value` between units sharing a table. Non-finite values, unknown
 * units and zero divisors produce `0`; inputs and tables are never mutated.
 */
export function convert<Unit extends string>(
  value: number,
  table: UnitTable<Unit>,
  from: Unit,
  to: Unit,
): number {
  if (!Number.isFinite(value)) return 0;
  const fromFactor = table.factors[from];
  const toFactor = table.factors[to];
  if (!Number.isFinite(fromFactor) || !Number.isFinite(toFactor) || toFactor === 0) return 0;
  const result = (value * fromFactor) / toFactor;
  return Number.isFinite(result) ? result : 0;
}
