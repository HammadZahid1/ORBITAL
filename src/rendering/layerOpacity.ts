/** Default opacity presets for each viewport layer and render quality. */

import { clamp, finiteOr } from '../engine/numeric';
import type { LayerId, RenderQuality } from '../types/visualization';

export const LAYER_OPACITY_PRESETS: Record<LayerId, number> = {
  starfield: 1,
  bodies: 1,
  orbits: 0.4,
  trails: 0.55,
  'velocity-vectors': 0.8,
  'acceleration-vectors': 0.8,
  'gravity-vectors': 0.45,
  barycenter: 0.9,
  labels: 1,
  grid: 0.25,
  'asteroid-belts': 0.7,
  spacetime: 0.35,
  'comet-tails': 0.55,
};

export const QUALITY_OPACITY_SCALE: Record<RenderQuality, number> = {
  low: 0.8,
  balanced: 1,
  high: 1,
  custom: 1,
};

/** Resolved opacity for a layer, quality and user multiplier. */
export function layerOpacity(layer: LayerId, quality: RenderQuality = 'balanced', userOpacity = 1): number {
  const preset = LAYER_OPACITY_PRESETS[layer] ?? 1;
  const scale = QUALITY_OPACITY_SCALE[quality] ?? 1;
  return clamp(preset * scale * clamp(finiteOr(userOpacity, 0), 0, 1), 0, 1);
}

/** Entries for UI selectors; returned as a new array. */
export function opacityPresetEntries(): Array<[LayerId, number]> {
  return Object.entries(LAYER_OPACITY_PRESETS) as Array<[LayerId, number]>;
}
