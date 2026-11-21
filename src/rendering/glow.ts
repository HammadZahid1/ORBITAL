/** Visual glow intensity derived from luminosity (not physical radiometry). */

import { clamp, finiteOr } from '../engine/numeric';
import { mixHex } from './color';

/** IAU nominal solar luminosity, W. */
export const SOLAR_LUMINOSITY_WATTS = 3.828e26;
export const MAX_GLOW_INTENSITY = 2.5;

/**
 * Logarithmically compressed, bounded glow strength. Zero luminosity yields
 * zero glow; negative and non-finite inputs are treated as zero.
 */
export function glowIntensityFromLuminosity(
  luminosityWatts: number,
  referenceLuminosity = SOLAR_LUMINOSITY_WATTS,
): number {
  const value = Math.max(finiteOr(luminosityWatts, 0), 0);
  const reference = Math.max(finiteOr(referenceLuminosity, SOLAR_LUMINOSITY_WATTS), 1e-12);
  return clamp(Math.log10(1 + value / reference) * 0.85, 0, MAX_GLOW_INTENSITY);
}

/** Blends a cool halo colour into a hot core colour as luminosity rises. */
export function glowColorFromLuminosity(
  luminosityWatts: number,
  hotColor = '#fff0c9',
  coolColor = '#ef5b23',
): string {
  const intensity = glowIntensityFromLuminosity(luminosityWatts);
  return mixHex(coolColor, hotColor, clamp(intensity / MAX_GLOW_INTENSITY, 0, 1));
}

/** Convenience wrapper used when a material wants an emissive scalar. */
export function emissiveIntensityFromLuminosity(luminosityWatts: number): number {
  return glowIntensityFromLuminosity(luminosityWatts);
}
