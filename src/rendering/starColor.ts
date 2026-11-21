/**
 * Illustrative blackbody colour approximation for stars. The polynomial fit is
 * an educational visual estimate, not a spectrophotometric model.
 */

import { clamp } from '../engine/numeric';
import { clampUnit, rgbToHex } from './color';
import type { Rgb } from './types';

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export const STAR_TEMPERATURE_RANGE = { min: 1000, max: 40000 } as const;
export const SOLAR_EFFECTIVE_TEMPERATURE = 5778;

function safeTemperature(kelvin: number): number {
  const value = Number.isFinite(kelvin) ? kelvin : SOLAR_EFFECTIVE_TEMPERATURE;
  return clamp(value, STAR_TEMPERATURE_RANGE.min, STAR_TEMPERATURE_RANGE.max);
}

/** Approximate blackbody RGB in the 0..1 range. */
export function blackbodyRgb(kelvin: number): Rgb {
  const t = safeTemperature(kelvin) / 100;
  let red: number;
  let green: number;
  let blue: number;

  if (t <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    red = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  if (t >= 66) {
    blue = 255;
  } else if (t <= 19) {
    blue = 0;
  } else {
    blue = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  return [clampUnit(red / 255), clampUnit(green / 255), clampUnit(blue / 255)];
}

/** Hexadecimal star colour for an effective temperature in kelvin. */
export function starColorFromTemperature(kelvin: number): string {
  return rgbToHex(blackbodyRgb(kelvin));
}

/** Coarse spectral classification by effective temperature. */
export function spectralClassFromTemperature(kelvin: number): SpectralClass {
  const value = safeTemperature(kelvin);
  if (value >= 30000) return 'O';
  if (value >= 10000) return 'B';
  if (value >= 7500) return 'A';
  if (value >= 6000) return 'F';
  if (value >= 5200) return 'G';
  if (value >= 3700) return 'K';
  return 'M';
}

export interface StarColorProfile {
  temperature: number;
  rgb: Rgb;
  hex: string;
  spectralClass: SpectralClass;
}

/** Bundles colour and class information for panels and shader inputs. */
export function starColorProfile(kelvin: number): StarColorProfile {
  const temperature = safeTemperature(kelvin);
  return {
    temperature,
    rgb: blackbodyRgb(temperature),
    hex: rgbToHex(blackbodyRgb(temperature)),
    spectralClass: spectralClassFromTemperature(temperature),
  };
}
