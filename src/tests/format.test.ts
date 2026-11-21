import { describe, expect, it } from 'vitest';
import { formatDuration as legacyFormatDuration, formatScientific as legacyFormatScientific } from '../engine/numeric';
import {
  ANGLE_UNITS,
  LENGTH_UNITS,
  MASS_UNITS,
  SPEED_UNITS,
  STANDARD_GRAVITY,
  TIME_UNITS,
  UNIT_CONVERSION_TABLES,
  compactScale,
  convert,
  engineeringExponent,
  formatAcceleration,
  formatAngle,
  formatAstronomicalDistance,
  formatClock,
  formatCompactCount,
  formatDegreesMinutesSeconds,
  formatDistance,
  formatDuration,
  formatEarthMasses,
  formatEngineering,
  formatInterval,
  formatIntervalWithUnit,
  formatKilometresPerHour,
  formatMass,
  formatNumber,
  formatPercent,
  formatPercentChange,
  formatRelativeUncertainty,
  formatScientific,
  formatSignificantFigures,
  formatSolarMasses,
  formatSpeedOfLightFraction,
  formatStandardGravity,
  formatTemperature,
  formatUncertainty,
  formatVector,
  formatVectorMagnitude,
  formatVelocity,
  formatWithSiPrefix,
  formatWithUnit,
  isUnitKey,
  kelvinToCelsius,
  kelvinToFahrenheit,
  parseFormattedNumber,
  roundToSignificantFigures,
  scientificParts,
  siPrefixFor,
  siPrefixSymbol,
  unitSymbol,
  type AstronomicalDistanceUnit,
  type LengthUnit,
} from '../format';

describe('scientific notation', () => {
  it('always renders explicit base-10 exponents', () => {
    expect(formatScientific(1234, 2)).toBe('1.23e3');
    expect(formatScientific(-0.0045, 2)).toBe('-4.50e-3');
    expect(formatScientific(1e21, 1)).toBe('1.0e21');
    expect(formatScientific(1e-9, 0)).toBe('1e-9');
  });

  it('sanitises zero, signed zero and non-finite values', () => {
    expect(formatScientific(0)).toBe('0');
    expect(formatScientific(-0)).toBe('0');
    expect(formatScientific(Number.NaN)).toBe('—');
    expect(formatScientific(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatScientific(Number.NEGATIVE_INFINITY)).toBe('—');
  });

  it('exposes rounded mantissa/exponent parts and clamps digit counts', () => {
    expect(scientificParts(1234, 2)).toEqual({ mantissa: 1.23, exponent: 3 });
    expect(scientificParts(9.99, 1)).toEqual({ mantissa: 1, exponent: 1 });
    expect(scientificParts(0)).toEqual({ mantissa: 0, exponent: 0 });
    expect(scientificParts(Number.NaN)).toEqual({ mantissa: 0, exponent: 0 });
    expect(formatScientific(1.23456, Number.NaN)).toBe('1.235e0');
    expect(formatScientific(1.2, -5)).toBe('1e0');
    expect(formatScientific(1.2, 99)).toBe('1.200000000000e0');
  });

  it('does not duplicate the legacy adaptive scientific helper', () => {
    expect(legacyFormatScientific(1234, 2)).toBe('1,234');
    expect(formatScientific(1234, 2)).not.toBe(legacyFormatScientific(1234, 2));
  });
});

describe('engineering notation', () => {
  it('returns exponents that are multiples of three', () => {
    expect(engineeringExponent(1234)).toBe(3);
    expect(engineeringExponent(0.0000012)).toBe(-6);
    expect(engineeringExponent(1e21)).toBe(21);
    expect(engineeringExponent(0)).toBe(0);
    expect(engineeringExponent(Number.NaN)).toBe(0);
  });

  it('keeps the mantissa below 1000 and honours significant figures', () => {
    expect(formatEngineering(1234, 4)).toBe('1.234e3');
    expect(formatEngineering(999.9, 3)).toBe('1.00e3');
    expect(formatEngineering(0.0000012, 3)).toBe('1.20e-6');
    expect(formatEngineering(-0.5, 2)).toBe('-500e-3');
  });

  it('handles zero, non-finite values and upper boundary carries', () => {
    expect(formatEngineering(0)).toBe('0');
    expect(formatEngineering(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatEngineering(999999, 4)).toBe('1.000e6');
    expect(formatEngineering(1000, 2)).toBe('1.0e3');
  });
});

describe('significant figure rounding', () => {
  it('rounds numbers to the requested significant figures', () => {
    expect(roundToSignificantFigures(12345, 3)).toBe(12300);
    expect(roundToSignificantFigures(0.0009999, 2)).toBe(0.001);
    expect(roundToSignificantFigures(9.999, 3)).toBe(10);
    expect(roundToSignificantFigures(-1.2345, 2)).toBe(-1.2);
  });

  it('preserves trailing zeros in text form', () => {
    expect(formatSignificantFigures(1.2345, 3)).toBe('1.23');
    expect(formatSignificantFigures(1.2, 4)).toBe('1.200');
    expect(formatSignificantFigures(1.005, 3)).toBe('1.00');
    expect(formatSignificantFigures(999.9, 3)).toBe('1.00e3');
    expect(formatSignificantFigures(0, 3)).toBe('0.00');
  });

  it('sanitises invalid inputs and digit counts', () => {
    expect(roundToSignificantFigures(Number.NaN, 3)).toBe(0);
    expect(roundToSignificantFigures(Number.POSITIVE_INFINITY)).toBe(0);
    expect(formatSignificantFigures(Number.NEGATIVE_INFINITY)).toBe('—');
    expect(roundToSignificantFigures(1.23456, 0)).toBe(1);
    expect(roundToSignificantFigures(1.23456, Number.NaN)).toBe(1.23);
  });
});

describe('SI prefixes', () => {
  it('selects prefixes using powers of 1000', () => {
    expect(siPrefixFor(999).symbol).toBe('');
    expect(siPrefixFor(1000).symbol).toBe('k');
    expect(siPrefixFor(0.001).symbol).toBe('m');
    expect(siPrefixFor(1e-6).symbol).toBe('µ');
    expect(siPrefixFor(1234).exponent).toBe(3);
    expect(siPrefixFor(1e-30).symbol).toBe('q');
    expect(siPrefixFor(1e30).symbol).toBe('Q');
  });

  it('formats scaled values with a unit label', () => {
    expect(formatWithSiPrefix(1500, 'm')).toBe('1.50 km');
    expect(formatWithSiPrefix(0.002, 's')).toBe('2.00 ms');
    expect(formatWithSiPrefix(0, 'm')).toBe('0.00 m');
    expect(formatWithSiPrefix(5)).toBe('5.00');
    expect(formatWithSiPrefix(Number.NaN, 'm')).toBe('—');
  });

  it('handles exact prefix boundaries', () => {
    expect(formatWithSiPrefix(999, 'm')).toBe('999.00 m');
    expect(formatWithSiPrefix(1000, 'm')).toBe('1.00 km');
    expect(formatWithSiPrefix(0.000999, 'm')).toBe('999.00 µm');
    expect(formatWithSiPrefix(0.001, 'm')).toBe('1.00 mm');
  });

  it('clamps extremes and preserves sign', () => {
    expect(formatWithSiPrefix(-2500000, 'W', 1)).toBe('-2.5 MW');
    expect(formatWithSiPrefix(1e33, 'm', 1)).toBe('1000.0 Qm');
    expect(formatWithSiPrefix(1e-33, 'm', 1)).toBe('0.0 qm');
    expect(siPrefixSymbol(Number.NaN)).toBe('');
  });
});

describe('unit conversion table', () => {
  it('converts between units in each table', () => {
    expect(convert(1, LENGTH_UNITS, 'astronomicalUnit', 'metre')).toBe(1.495978707e11);
    expect(convert(1, TIME_UNITS, 'hour', 'minute')).toBe(60);
    expect(convert(1, MASS_UNITS, 'solarMass', 'kilogram')).toBe(1.98847e30);
    expect(convert(Math.PI, ANGLE_UNITS, 'radian', 'degree')).toBeCloseTo(180, 10);
    expect(convert(10, SPEED_UNITS, 'metrePerSecond', 'kilometrePerHour')).toBeCloseTo(36, 10);
  });

  it('is frozen and finite-safe for bad inputs', () => {
    expect(Object.isFrozen(LENGTH_UNITS)).toBe(true);
    expect(Object.isFrozen(LENGTH_UNITS.factors)).toBe(true);
    expect(Object.isFrozen(UNIT_CONVERSION_TABLES)).toBe(true);
    expect(convert(Number.NaN, TIME_UNITS, 'second', 'minute')).toBe(0);
    expect(convert(Number.POSITIVE_INFINITY, TIME_UNITS, 'second', 'minute')).toBe(0);
    expect(convert(1, LENGTH_UNITS, 'unknown' as LengthUnit, 'metre')).toBe(0);
  });
});

describe('distance formatting', () => {
  it('formats SI distances', () => {
    expect(formatDistance(1500)).toBe('1.50 km');
    expect(formatDistance(384400000, 1)).toBe('384.4 Mm');
    expect(formatDistance(0.001)).toBe('1.00 mm');
    expect(formatDistance(Number.NaN)).toBe('—');
  });

  it('formats astronomical distances from the shared table', () => {
    expect(formatAstronomicalDistance(1.495978707e11)).toBe('1.000 AU');
    expect(formatAstronomicalDistance(9.4607304725808e15, 'ly', 2)).toBe('1.00 ly');
    expect(formatAstronomicalDistance(convert(1, LENGTH_UNITS, 'parsec', 'metre'), 'pc', 2)).toBe(
      '1.00 pc',
    );
    expect(formatAstronomicalDistance(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatAstronomicalDistance(1.495978707e11, 'bad' as AstronomicalDistanceUnit, 2)).toBe(
      '1.00 AU',
    );
  });
});

describe('mass formatting', () => {
  it('rescales grams so prefixes never stack', () => {
    expect(formatMass(1)).toBe('1.00 kg');
    expect(formatMass(1500)).toBe('1.50 Mg');
    expect(formatMass(1e-6)).toBe('1.00 mg');
    expect(formatMass(Number.NaN)).toBe('—');
  });

  it('formats astrophysical masses', () => {
    expect(formatSolarMasses(1.98847e30, 2)).toBe('1.00 M☉');
    expect(formatEarthMasses(5.9722e24, 2)).toBe('1.00 M⊕');
    expect(formatSolarMasses(0)).toBe('0.000 M☉');
    expect(formatEarthMasses(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('duration formatting', () => {
  it('composes the most significant components', () => {
    expect(formatDuration(90061)).toBe('1 d 1 h 1 m');
    expect(formatDuration(90)).toBe('1 m 30.0 s');
    expect(formatDuration(0)).toBe('0.0 s');
    expect(formatDuration(-90)).toBe('-1 m 30.0 s');
    expect(formatDuration(Number.NaN)).toBe('—');
  });

  it('honours component limits and seconds precision', () => {
    expect(formatDuration(90061, { maxComponents: 5, fractionDigits: 0 })).toBe('1 d 1 h 1 m 1 s');
    expect(formatDuration(3600, { maxComponents: 1 })).toBe('1 h');
    expect(formatDuration(3661, { maxComponents: 2 })).toBe('1 h 1 m');
    expect(formatDuration(90, { fractionDigits: 0 })).toBe('1 m 30 s');
    expect(formatDuration(1.25, { maxComponents: Number.NaN, fractionDigits: -3 })).toBe('1 s');
  });

  it('formats clock strings and millisecond fields', () => {
    expect(formatClock(3661)).toBe('01:01:01');
    expect(formatClock(90061)).toBe('1 d 01:01:01');
    expect(formatClock(1.5, { milliseconds: true })).toBe('00:00:01.500');
    expect(formatClock(-1)).toBe('-00:00:01');
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('differs from the legacy single-unit duration helper', () => {
    expect(legacyFormatDuration(90)).toBe('0.03 h');
    expect(formatDuration(90)).not.toBe(legacyFormatDuration(90));
  });
});

describe('velocity formatting', () => {
  it('applies SI prefixes to metres per second', () => {
    expect(formatVelocity(30000)).toBe('30.00 km/s');
    expect(formatVelocity(1000)).toBe('1.00 km/s');
    expect(formatVelocity(0.001)).toBe('1.00 mm/s');
    expect(formatVelocity(Number.NaN)).toBe('—');
  });

  it('formats light-speed fractions and kilometres per hour', () => {
    expect(formatSpeedOfLightFraction(149896229, 3)).toBe('0.500 c');
    expect(formatKilometresPerHour(10)).toBe('36.0 km/h');
    expect(formatSpeedOfLightFraction(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatKilometresPerHour(Number.NaN)).toBe('—');
  });
});

describe('acceleration formatting', () => {
  it('applies SI prefixes to metres per second squared', () => {
    expect(STANDARD_GRAVITY).toBe(9.80665);
    expect(formatAcceleration(9.80665)).toBe('9.81 m/s²');
    expect(formatAcceleration(1000)).toBe('1.00 km/s²');
    expect(formatAcceleration(Number.NaN)).toBe('—');
  });

  it('formats multiples of standard gravity', () => {
    expect(formatStandardGravity(STANDARD_GRAVITY)).toBe('1.000 g₀');
    expect(formatStandardGravity(-2 * STANDARD_GRAVITY)).toBe('-2.000 g₀');
    expect(formatStandardGravity(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('angle formatting', () => {
  it('formats degrees and radians', () => {
    expect(formatAngle(Math.PI)).toBe('180.0°');
    expect(formatAngle(Math.PI, { unit: 'rad', digits: 3 })).toBe('3.142 rad');
    expect(formatAngle(-Math.PI / 2)).toBe('-90.0°');
    expect(formatAngle(Number.NaN)).toBe('—');
  });

  it('formats degrees, minutes and seconds', () => {
    expect(formatDegreesMinutesSeconds(Math.PI / 2)).toBe('90° 0′ 0.0″');
    expect(formatDegreesMinutesSeconds((12.5 * Math.PI) / 180)).toBe('12° 30′ 0.0″');
    expect(formatDegreesMinutesSeconds(-Math.PI / 4)).toBe('-45° 0′ 0.0″');
    expect(formatDegreesMinutesSeconds(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('carries a rounded 60-second overflow into the degree field', () => {
    expect(formatDegreesMinutesSeconds((59.99999999 * Math.PI) / 180, 1)).toBe('60° 0′ 0.0″');
  });
});

describe('temperature formatting', () => {
  it('formats Kelvin, Celsius and Fahrenheit', () => {
    expect(formatTemperature(300)).toBe('300.0 K');
    expect(formatTemperature(300, { unit: 'C' })).toBe('26.9 °C');
    expect(formatTemperature(300, { unit: 'F' })).toBe('80.3 °F');
    expect(formatTemperature(300, { digits: 0 })).toBe('300 K');
  });

  it('clamps sub-absolute-zero inputs', () => {
    expect(formatTemperature(-10, { unit: 'K' })).toBe('0.0 K');
    expect(formatTemperature(-10, { unit: 'C' })).toBe('-273.1 °C');
    expect(kelvinToCelsius(0)).toBe(-273.15);
    expect(kelvinToFahrenheit(273.15)).toBeCloseTo(32, 10);
  });

  it('returns the invalid marker for non-finite inputs', () => {
    expect(formatTemperature(Number.NaN)).toBe('—');
    expect(formatTemperature(Number.POSITIVE_INFINITY, { unit: 'C' })).toBe('—');
    expect(kelvinToCelsius(Number.NaN)).toBe(0);
  });
});

describe('vector formatting', () => {
  it('formats components with a shared unit suffix', () => {
    expect(formatVector({ x: 1, y: -2, z: 3.456 }, { digits: 2, unit: 'm' })).toBe(
      '(1.00, -2.00, 3.46) m',
    );
    expect(formatVector({ x: 1, y: 2, z: 3 })).toBe('(1.00, 2.00, 3.00)');
    expect(formatVector({ x: 1234, y: 0, z: -0.004 }, { notation: 'scientific', digits: 2 })).toBe(
      '(1.23e3, 0, -4.00e-3)',
    );
  });

  it('isolates invalid components and computes finite magnitudes', () => {
    expect(formatVector({ x: Number.NaN, y: 2, z: Number.POSITIVE_INFINITY })).toBe(
      '(—, 2.00, —)',
    );
    expect(formatVectorMagnitude({ x: 3, y: 4, z: 0 })).toBe('5.00');
    expect(formatVectorMagnitude({ x: Number.NaN, y: 0, z: 0 })).toBe('—');
  });
});

describe('interval formatting', () => {
  it('normalises reversed endpoints', () => {
    expect(formatInterval(2, 1)).toBe('[1.00, 2.00]');
    expect(formatInterval(1, 2, 0)).toBe('[1, 2]');
    expect(formatInterval(Number.NaN, 2)).toBe('—');
  });

  it('shares one SI prefix across both endpoints', () => {
    expect(formatIntervalWithUnit(1000, 2500, 'm')).toBe('1.00–2.50 km');
    expect(formatIntervalWithUnit(2500, 1000, 'm')).toBe('1.00–2.50 km');
    expect(formatIntervalWithUnit(1, 2)).toBe('1.00–2.00');
    expect(formatIntervalWithUnit(1, Number.POSITIVE_INFINITY, 'm')).toBe('—');
  });
});

describe('percent formatting', () => {
  it('formats fractions as percentages', () => {
    expect(formatPercent(0.125)).toBe('12.5%');
    expect(formatPercent(-0.05)).toBe('-5.0%');
    expect(formatPercent(1.5, 0)).toBe('150%');
    expect(formatPercent(Number.NaN)).toBe('—');
  });

  it('formats signed relative change and rejects invalid baselines', () => {
    expect(formatPercentChange(100, 110)).toBe('+10.0%');
    expect(formatPercentChange(100, 90)).toBe('-10.0%');
    expect(formatPercentChange(-100, -110)).toBe('-10.0%');
    expect(formatPercentChange(0, 10)).toBe('—');
    expect(formatPercentChange(Number.POSITIVE_INFINITY, 10)).toBe('—');
  });
});

describe('uncertainty formatting', () => {
  it('derives decimals from the uncertainty magnitude', () => {
    expect(formatUncertainty(1.234, 0.05)).toBe('1.23 ± 0.05');
    expect(formatUncertainty(12.34, 0.4)).toBe('12.3 ± 0.4');
    expect(formatUncertainty(10, 2, 'kg')).toBe('10 ± 2 kg');
  });

  it('handles zero uncertainty and invalid inputs', () => {
    expect(formatUncertainty(1.2, 0)).toBe('1.20 ± 0.00');
    expect(formatUncertainty(Number.NaN, 0.1)).toBe('—');
    expect(formatUncertainty(1, Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('formats relative uncertainty', () => {
    expect(formatRelativeUncertainty(10, 1)).toBe('±10.0%');
    expect(formatRelativeUncertainty(10, 1, 0)).toBe('±10%');
    expect(formatRelativeUncertainty(0, 1)).toBe('—');
    expect(formatRelativeUncertainty(Number.NaN, 1)).toBe('—');
  });
});

describe('compact counts', () => {
  it('uses short-scale suffixes', () => {
    expect(formatCompactCount(999)).toBe('999');
    expect(formatCompactCount(1234)).toBe('1.2K');
    expect(formatCompactCount(1e6)).toBe('1.0M');
    expect(formatCompactCount(-1500)).toBe('-1.5K');
    expect(formatCompactCount(Number.NaN)).toBe('—');
  });

  it('promotes rounded boundary values to the next suffix', () => {
    expect(formatCompactCount(999.6)).toBe('1.0K');
    expect(formatCompactCount(999999)).toBe('1.0M');
    expect(formatCompactCount(1e12)).toBe('1.0T');
    expect(formatCompactCount(1e15)).toBe('1000.0T');
  });

  it('exposes the selected scale and clamps digits', () => {
    expect(compactScale(1234)).toEqual({ divisor: 1000, symbol: 'K' });
    expect(compactScale(500)).toEqual({ divisor: 1, symbol: '' });
    expect(compactScale(Number.POSITIVE_INFINITY)).toEqual({ divisor: 1, symbol: '' });
    expect(formatCompactCount(1234, Number.NaN)).toBe('1.2K');
    expect(formatCompactCount(1234, -2)).toBe('1K');
  });
});

describe('locale-safe numeric formatting', () => {
  it('groups and rounds with stable en-US conventions', () => {
    expect(formatNumber(1234567.891, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('1,234,567.89');
    expect(formatNumber(1234.5, { maximumFractionDigits: 1 })).toBe('1,234.5');
    expect(formatNumber(Number.NaN)).toBe('—');
  });

  it('honours minimum decimals and grouping switches', () => {
    expect(formatNumber(1.2, { minimumFractionDigits: 3, maximumFractionDigits: 3 })).toBe('1.200');
    expect(formatNumber(1.234, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('1.2');
    expect(formatNumber(1234567, { useGrouping: false })).toBe('1234567');
    expect(formatNumber(-0, { maximumFractionDigits: 2 })).toBe('0');
  });

  it('parses formatted text back to finite numbers', () => {
    expect(parseFormattedNumber('1,234.50')).toBe(1234.5);
    expect(parseFormattedNumber('—')).toBe(0);
    expect(parseFormattedNumber('not a number')).toBe(0);
    expect(parseFormattedNumber(formatNumber(9876.54, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))).toBe(9876.54);
  });
});

describe('unit label registry', () => {
  it('exposes canonical symbols and safe key checks', () => {
    expect(unitSymbol('metre')).toBe('m');
    expect(unitSymbol('acceleration')).toBe('m/s²');
    expect(isUnitKey('second')).toBe(true);
    expect(isUnitKey('not-a-unit')).toBe(false);
  });

  it('applies registry separators and preserves invalid markers', () => {
    expect(formatWithUnit('90', 'degree')).toBe('90°');
    expect(formatWithUnit('3.14', 'radian')).toBe('3.14 rad');
    expect(formatWithUnit('—', 'metre')).toBe('—');
    expect(formatWithUnit('1', 'dimensionless')).toBe('1');
  });
});

describe('barrel and purity', () => {
  it('re-exports a single registry and helpers that delegate consistently', () => {
    expect(formatDistance(1500)).toBe(formatWithSiPrefix(1500, 'm'));
    expect(unitSymbol('velocity')).toBe('m/s');
    expect(siPrefixSymbol(1000)).toBe('k');
  });

  it('is deterministic across repeated calls', () => {
    expect(formatVelocity(12345.678)).toBe(formatVelocity(12345.678));
    expect(formatUncertainty(9.876, 0.25, 'J')).toBe(formatUncertainty(9.876, 0.25, 'J'));
    expect(formatIntervalWithUnit(12, 999, 'm')).toBe(formatIntervalWithUnit(12, 999, 'm'));
  });
});
