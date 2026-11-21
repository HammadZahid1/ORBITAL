/** Deterministic, seed-driven colour palettes for bodies and visual effects. */

import { clamp, createRandom, hashString } from '../engine/numeric';
import { hslToRgb, mixHex, rgbToHex } from './color';
import type { HexColor, Palette } from './types';

export interface PaletteConfig {
  seed: number;
  /** Optional label mixed into the seed so distinct subjects diverge. */
  name?: string;
  /** Base hue in degrees. Omit to derive it from the seed. */
  hue?: number;
  saturation?: number;
  /** Number of extra interpolated swatches to append. */
  count?: number;
}

/** Reuses the generator's stable string hash; no second RNG implementation. */
export function paletteSeed(seed: number, name = 'palette'): number {
  return hashString(`${name}:${seed}`);
}

/** Builds a repeatable hue-based palette plus optional interpolated swatches. */
export function generatePalette(config: PaletteConfig): Palette {
  const random = createRandom(paletteSeed(config.seed, config.name));
  const baseHue =
    config.hue === undefined ? random() * 360 : clamp(Number.isFinite(config.hue) ? config.hue : 0, 0, 360);
  const saturation = clamp(Number.isFinite(config.saturation) ? config.saturation! : 0.55, 0, 1);
  const base = rgbToHex(hslToRgb(baseHue, saturation, 0.52));
  const accent = rgbToHex(
    hslToRgb(baseHue + 32 + random() * 24, clamp(saturation * 1.1, 0, 1), 0.36),
  );
  const highlight = rgbToHex(hslToRgb(baseHue - 12, saturation * 0.8, 0.78));
  const shadow = rgbToHex(hslToRgb(baseHue + 180, saturation * 0.6, 0.14));
  const glow = rgbToHex(hslToRgb(baseHue - 24, clamp(saturation * 1.2, 0, 1), 0.66));

  const requested = config.count;
  const extras = Math.max(
    0,
    Math.min(32, Math.floor(typeof requested === 'number' && Number.isFinite(requested) ? requested : 0)),
  );
  const colors: HexColor[] = [base, accent, highlight, shadow, glow];
  for (let i = 0; i < extras; i += 1) {
    const from = i % 2 === 0 ? base : accent;
    const to = i % 2 === 0 ? highlight : shadow;
    colors.push(mixHex(from, to, (i + 1) / (extras + 1)));
  }

  return { seed: config.seed, base, accent, highlight, shadow, glow, colors };
}

/** Wraps a palette index so negative and oversized indices remain usable. */
export function paletteColorAt(palette: Palette, index: number): HexColor {
  if (palette.colors.length === 0) return '#000000';
  const step = Number.isFinite(index) ? Math.trunc(index) : 0;
  const wrapped = ((step % palette.colors.length) + palette.colors.length) % palette.colors.length;
  return palette.colors[wrapped]!;
}
