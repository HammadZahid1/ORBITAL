/**
 * Pure builders for shader uniform objects. They return plain `{ value }`
 * records, so they can be inspected and tested without instantiating Three.js.
 */

import type { MaterialPreset } from '../types/celestial';
import { hexToRgb } from './color';
import { MATERIAL_STYLE_INDEX } from './noisePresets';
import type { Rgb, UniformEntry, UniformRecord } from './types';

function numericUniform(value: number): UniformEntry<number> {
  return { value: Number.isFinite(value) ? value : 0 };
}

function rgbUniform(hex: string): UniformEntry<Rgb> {
  return { value: hexToRgb(hex) };
}

function vectorUniform(values: readonly [number, number, number]): UniformEntry<Rgb> {
  return {
    value: [
      Number.isFinite(values[0]) ? values[0] : 0,
      Number.isFinite(values[1]) ? values[1] : 0,
      Number.isFinite(values[2]) ? values[2] : 0,
    ],
  };
}

export type PlanetUniformKey = 'uColor' | 'uAccent' | 'uLight' | 'uTime' | 'uStyle' | 'uEmissive';

export interface PlanetUniformInput {
  color: string;
  accentColor: string;
  material: MaterialPreset;
  emissiveIntensity: number;
  lightPosition: readonly [number, number, number];
  time?: number;
}

export function buildPlanetUniforms(input: PlanetUniformInput): UniformRecord<PlanetUniformKey> {
  return {
    uColor: rgbUniform(input.color),
    uAccent: rgbUniform(input.accentColor),
    uLight: vectorUniform(input.lightPosition),
    uTime: numericUniform(input.time ?? 0),
    uStyle: numericUniform(MATERIAL_STYLE_INDEX[input.material] ?? 0),
    uEmissive: numericUniform(input.emissiveIntensity),
  };
}

export type AtmosphereUniformKey = 'uColor' | 'uIntensity' | 'uTime';

export interface AtmosphereUniformInput {
  color: string;
  intensity: number;
  time?: number;
}

export function buildAtmosphereUniforms(input: AtmosphereUniformInput): UniformRecord<AtmosphereUniformKey> {
  return {
    uColor: rgbUniform(input.color),
    uIntensity: numericUniform(input.intensity),
    uTime: numericUniform(input.time ?? 0),
  };
}

export type RingUniformKey = 'uColor' | 'uOpacity' | 'uSeed';

export interface RingUniformInput {
  color: string;
  opacity: number;
  seed?: number;
}

export function buildRingUniforms(input: RingUniformInput): UniformRecord<RingUniformKey> {
  return {
    uColor: rgbUniform(input.color),
    uOpacity: numericUniform(input.opacity),
    uSeed: numericUniform(input.seed ?? 0),
  };
}

export type GlowUniformKey = 'uHot' | 'uCool' | 'uIntensity' | 'uTime';

export interface GlowUniformInput {
  hot: string;
  cool: string;
  intensity: number;
  time?: number;
}

export function buildGlowUniforms(input: GlowUniformInput): UniformRecord<GlowUniformKey> {
  return {
    uHot: rgbUniform(input.hot),
    uCool: rgbUniform(input.cool),
    uIntensity: numericUniform(input.intensity),
    uTime: numericUniform(input.time ?? 0),
  };
}

/** Flattens numeric uniform values (including RGB channels) for validation. */
export function uniformNumericValues<K extends string>(uniforms: UniformRecord<K>): number[] {
  const values: number[] = [];
  for (const key of Object.keys(uniforms) as K[]) {
    const entry = uniforms[key];
    if (typeof entry.value === 'number') values.push(entry.value);
    else values.push(...entry.value);
  }
  return values;
}
