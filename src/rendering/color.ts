/**
 * Pure colour and scalar helpers. They deliberately avoid Three.js so they can
 * be used in tests, panels and generators without a WebGL context.
 */

import { clamp, finiteOr } from '../engine/numeric';
import type { HexColor, Rgb } from './types';

/** Clamps a scalar to the unit interval, treating non-finite input as zero. */
export function clampUnit(value: number): number {
  return clamp(finiteOr(value, 0), 0, 1);
}

/** Linear interpolation with a clamped interpolation factor. */
export function lerp(a: number, b: number, t: number): number {
  const start = finiteOr(a, 0);
  return start + (finiteOr(b, 0) - start) * clampUnit(t);
}

/** Smooth Hermite interpolation between two edges. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const low = finiteOr(edge0, 0);
  const high = finiteOr(edge1, 1);
  const value = finiteOr(x, 0);
  if (low === high) return value >= high ? 1 : 0;
  const t = clampUnit((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Recognises three- and six-digit hexadecimal CSS colours. */
export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/** Converts a hexadecimal colour to unit-range RGB. Invalid input is black. */
export function hexToRgb(hex: HexColor): Rgb {
  if (!isHexColor(hex)) return [0, 0, 0];
  const digits = hex.slice(1);
  const expanded = digits.length === 3 ? digits.replace(/./g, (character) => character + character) : digits;
  return [
    parseInt(expanded.slice(0, 2), 16) / 255,
    parseInt(expanded.slice(2, 4), 16) / 255,
    parseInt(expanded.slice(4, 6), 16) / 255,
  ];
}

function channelToHex(value: number): string {
  return Math.round(clampUnit(value) * 255)
    .toString(16)
    .padStart(2, '0');
}

/** Converts unit-range RGB to a lowercase six-digit hexadecimal colour. */
export function rgbToHex(rgb: Rgb): HexColor {
  return `#${channelToHex(rgb[0])}${channelToHex(rgb[1])}${channelToHex(rgb[2])}`;
}

/** Component-wise linear interpolation between two RGB colours. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Hexadecimal convenience wrapper around `mixRgb`. */
export function mixHex(a: HexColor, b: HexColor, t: number): HexColor {
  return rgbToHex(mixRgb(hexToRgb(a), hexToRgb(b), t));
}

/** Scales channels by a non-negative factor and clamps them to the unit range. */
export function scaleRgb(rgb: Rgb, factor: number): Rgb {
  const amount = Math.max(finiteOr(factor, 0), 0);
  return [clampUnit(rgb[0] * amount), clampUnit(rgb[1] * amount), clampUnit(rgb[2] * amount)];
}

/** Rec. 709 relative luminance, clamped to the unit range. */
export function luminance(rgb: Rgb): number {
  return clampUnit(
    0.2126 * finiteOr(rgb[0], 0) + 0.7152 * finiteOr(rgb[1], 0) + 0.0722 * finiteOr(rgb[2], 0),
  );
}

/** HSL (hue in degrees, saturation and lightness in 0..1) to unit-range RGB. */
export function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const h = (((finiteOr(hue, 0) % 360) + 360) % 360) / 360;
  const s = clampUnit(saturation);
  const l = clampUnit(lightness);
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset: number): number => {
    let t = offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [clampUnit(channel(h + 1 / 3)), clampUnit(channel(h)), clampUnit(channel(h - 1 / 3))];
}

/** CSS rgba string with integer channels and a clamped alpha. */
export function rgbToCss(rgb: Rgb, alpha = 1): string {
  const channel = (value: number): number => Math.round(clampUnit(value) * 255);
  return `rgba(${channel(rgb[0])}, ${channel(rgb[1])}, ${channel(rgb[2])}, ${clampUnit(alpha).toFixed(3)})`;
}
