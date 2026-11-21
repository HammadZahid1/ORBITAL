/** Named value-noise parameter sets mirroring the surface styles in the shaders. */

import { clamp, finiteOr } from '../engine/numeric';
import type { MaterialPreset } from '../types/celestial';
import type { NoiseParams } from './types';

export const NOISE_PRESETS: Record<MaterialPreset, NoiseParams> = {
  rocky: { scale: 5.5, detailScale: 18, octaves: 5, lacunarity: 2.03, gain: 0.5, warp: 0, threshold: 0.72 },
  desert: { scale: 7.5, detailScale: 22, octaves: 4, lacunarity: 2.1, gain: 0.48, warp: 0.25, threshold: 0.66 },
  ocean: { scale: 3.5, detailScale: 14, octaves: 5, lacunarity: 2.0, gain: 0.52, warp: 0.35, threshold: 0.55 },
  ice: { scale: 6, detailScale: 20, octaves: 4, lacunarity: 2.04, gain: 0.5, warp: 0.1, threshold: 0.7 },
  'gas-giant': { scale: 3, detailScale: 9, octaves: 5, lacunarity: 2.02, gain: 0.55, warp: 0.6, threshold: 0.5 },
  clouded: { scale: 4, detailScale: 12, octaves: 4, lacunarity: 2.05, gain: 0.5, warp: 0.45, threshold: 0.48 },
  volcanic: { scale: 9, detailScale: 26, octaves: 5, lacunarity: 2.08, gain: 0.45, warp: 0.3, threshold: 0.76 },
  star: { scale: 8, detailScale: 24, octaves: 4, lacunarity: 2.03, gain: 0.55, warp: 0.2, threshold: 0.6 },
  metal: { scale: 12, detailScale: 30, octaves: 3, lacunarity: 2.0, gain: 0.5, warp: 0, threshold: 0.6 },
  comet: { scale: 10, detailScale: 28, octaves: 4, lacunarity: 2.06, gain: 0.5, warp: 0.4, threshold: 0.62 },
  singularity: { scale: 4, detailScale: 10, octaves: 3, lacunarity: 2.0, gain: 0.5, warp: 0.8, threshold: 0.5 },
};

/** Shader style identifiers used by the material fragment shader. */
export const MATERIAL_STYLE_INDEX: Record<MaterialPreset, number> = {
  rocky: 0,
  desert: 1,
  ocean: 2,
  ice: 3,
  'gas-giant': 4,
  clouded: 5,
  volcanic: 6,
  star: 7,
  metal: 8,
  comet: 9,
  singularity: 10,
};

/** Returns a defensive copy so callers cannot mutate the shared preset. */
export function noisePreset(material: MaterialPreset): NoiseParams {
  return { ...NOISE_PRESETS[material] };
}

/** Fractal amplitudes from strongest to weakest. */
export function octaveWeights(params: NoiseParams): number[] {
  const count = clamp(Math.floor(finiteOr(params.octaves, 1)), 1, 8);
  const gain = clamp(finiteOr(params.gain, 0.5), 0, 1);
  const weights: number[] = [];
  let amplitude = 1;
  for (let i = 0; i < count; i += 1) {
    weights.push(amplitude);
    amplitude *= gain;
  }
  return weights;
}

/** Frequency of a given octave, useful for matching CPU and GPU detail. */
export function octaveFrequency(params: NoiseParams, octave: number): number {
  const index = clamp(Math.floor(finiteOr(octave, 0)), 0, 8);
  const scale = Math.max(finiteOr(params.scale, 1), 1e-6);
  const lacunarity = Math.max(finiteOr(params.lacunarity, 2), 1e-6);
  return scale * Math.pow(lacunarity, index);
}
