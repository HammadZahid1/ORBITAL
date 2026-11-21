/** Deterministic colour ramps for illustrative comet tails. */

import { clamp, finiteOr } from '../engine/numeric';
import { isHexColor, mixHex } from './color';
import type { ColorStop } from './types';

export const DEFAULT_COMET_TAIL_RAMP: readonly ColorStop[] = [
  { at: 0, color: '#f4ffff' },
  { at: 0.22, color: '#a9e6ff' },
  { at: 0.55, color: '#5b8fce' },
  { at: 1, color: '#17233b' },
];

/** Samples a ramp at 0..1. Input stops are never mutated. */
export function sampleRamp(stops: readonly ColorStop[], t: number): string {
  if (stops.length === 0) return '#000000';
  const sorted = [...stops].sort((a, b) => finiteOr(a.at, 0) - finiteOr(b.at, 0));
  const position = clamp(finiteOr(t, 0), 0, 1);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (position <= finiteOr(first.at, 0)) return first.color;
  if (position >= finiteOr(last.at, 1)) return last.color;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]!;
    const next = sorted[i]!;
    const nextAt = finiteOr(next.at, 0);
    if (position <= nextAt) {
      const startAt = finiteOr(previous.at, 0);
      const span = nextAt - startAt;
      const weight = span > 0 ? (position - startAt) / span : 0;
      return mixHex(previous.color, next.color, weight);
    }
  }
  return last.color;
}

/** Tail colour from head (0) to tip (1). */
export function cometTailColor(t: number, stops: readonly ColorStop[] = DEFAULT_COMET_TAIL_RAMP): string {
  return sampleRamp(stops, t);
}

/** Non-increasing tail opacity from head to tip. */
export function cometTailAlpha(t: number, falloff = 1.4): number {
  const position = clamp(finiteOr(t, 0), 0, 1);
  const exponent = Math.max(finiteOr(falloff, 1), 0);
  return clamp(Math.pow(1 - position, exponent), 0, 1);
}

/** Builds a three-stop ramp around a provided nucleus/tail colour. */
export function cometTailStops(color: string): ColorStop[] {
  const base = isHexColor(color) ? color : '#9fd8e8';
  return [
    { at: 0, color: '#ffffff' },
    { at: 0.35, color: base },
    { at: 1, color: '#101a2b' },
  ];
}

export interface CometTailSample {
  t: number;
  color: string;
  alpha: number;
}

/** Evenly spaced colour/alpha samples for a tail ramp. */
export function cometTailSamples(count: number, color = '#9fd8e8'): CometTailSample[] {
  const samples = clamp(Math.floor(finiteOr(count, 0)), 0, 128);
  const stops = cometTailStops(color);
  const result: CometTailSample[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    result.push({ t, color: cometTailColor(t, stops), alpha: cometTailAlpha(t) });
  }
  return result;
}
