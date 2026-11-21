/** CPU-side equivalents of the procedural ring band alpha profile. */

import { clamp, finiteOr } from '../engine/numeric';
import { smoothstep } from './color';
import type { RingBand } from './types';

/** Mirrors the illustrative annuli drawn by the ring component. */
export const DEFAULT_RING_BANDS: readonly RingBand[] = [
  { start: 0, end: 0.17, opacity: 0.35 },
  { start: 0.19, end: 0.42, opacity: 0.9 },
  { start: 0.45, end: 0.52, opacity: 0.4 },
  { start: 0.55, end: 0.88, opacity: 0.75 },
  { start: 0.91, end: 1, opacity: 0.3 },
];

export const RING_BAND_FEATHER = 0.012;

/** Maps an absolute radius to 0..1 between the inner and outer ring edges. */
export function normalizedRingRadius(radius: number, innerRadius: number, outerRadius: number): number {
  const inner = finiteOr(innerRadius, 0);
  const width = Math.max(finiteOr(outerRadius, 0) - inner, 1e-9);
  return clamp((finiteOr(radius, 0) - inner) / width, 0, 1);
}

/** Soft-edged, gap-aware ring opacity at a normalised radius. */
export function ringAlpha(t: number, bands: readonly RingBand[] = DEFAULT_RING_BANDS): number {
  const position = clamp(finiteOr(t, 0), 0, 1);
  let alpha = 0;
  for (const band of bands) {
    const start = clamp(finiteOr(band.start, 0), 0, 1);
    const end = clamp(finiteOr(band.end, 0), 0, 1);
    const rise = smoothstep(start - RING_BAND_FEATHER, start + RING_BAND_FEATHER, position);
    const fall = 1 - smoothstep(end - RING_BAND_FEATHER, end + RING_BAND_FEATHER, position);
    alpha = Math.max(alpha, rise * fall * clamp(finiteOr(band.opacity, 0), 0, 1));
  }
  return clamp(alpha, 0, 1);
}

export interface RingAlphaSample {
  t: number;
  alpha: number;
}

/** Samples a ring profile at evenly spaced normalised radii. */
export function ringAlphaSamples(count: number, bands?: readonly RingBand[]): RingAlphaSample[] {
  const samples = clamp(Math.floor(finiteOr(count, 0)), 0, 256);
  const result: RingAlphaSample[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    result.push({ t, alpha: ringAlpha(t, bands) });
  }
  return result;
}
