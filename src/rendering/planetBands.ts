/** Seeded latitudinal colour bands for planets and gaseous bodies. */

import { clamp, createRandom, hashString } from '../engine/numeric';
import type { MaterialPreset } from '../types/celestial';
import { mixHex } from './color';
import { NOISE_PRESETS } from './noisePresets';
import type { HexColor } from './types';

export interface BandPaletteConfig {
  base: HexColor;
  accent: HexColor;
  material?: MaterialPreset;
  seed?: number;
  count?: number;
}

/** Characteristic band count for each surface style. */
export function bandCountForMaterial(material: MaterialPreset): number {
  switch (material) {
    case 'gas-giant':
      return 12;
    case 'clouded':
      return 8;
    case 'star':
      return 9;
    case 'desert':
      return 7;
    case 'ice':
      return 6;
    case 'ocean':
      return 5;
    default:
      return 4;
  }
}

/** Produces a deterministic base/accent band sequence from north to south. */
export function planetBandColors(config: BandPaletteConfig): HexColor[] {
  const material = config.material ?? 'rocky';
  const requested = config.count;
  const count = clamp(
    Math.floor(typeof requested === 'number' && Number.isFinite(requested) ? requested : bandCountForMaterial(material)),
    2,
    24,
  );
  const random = createRandom(hashString(`${config.seed ?? 0}:${material}:${config.base}:${config.accent}`));
  const contrast = clamp(NOISE_PRESETS[material].threshold, 0.1, 0.9);
  const bands: HexColor[] = [];
  for (let i = 0; i < count; i += 1) {
    const wave = 0.5 + 0.5 * Math.sin((i / (count - 1)) * Math.PI * 3 + random() * 0.6);
    const weight = clamp(wave * contrast + (random() - 0.5) * 0.18, 0, 1);
    bands.push(mixHex(config.base, config.accent, weight));
  }
  return bands;
}

/** Maps a latitude in -1..1 to a band index, clamping out-of-range values. */
export function bandIndexForLatitude(bands: readonly HexColor[], latitude: number): number {
  if (bands.length === 0) return 0;
  const normalized = clamp(Number.isFinite(latitude) ? (latitude + 1) / 2 : 0.5, 0, 1);
  return Math.min(bands.length - 1, Math.floor(normalized * bands.length));
}

/** Samples a band at a latitude in -1..1. */
export function sampleBandColor(bands: readonly HexColor[], latitude: number): HexColor {
  return bands[bandIndexForLatitude(bands, latitude)] ?? '#000000';
}
