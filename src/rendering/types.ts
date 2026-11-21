/** Shared, WebGL-free value types for the procedural rendering helpers. */

/** Linear RGB channels in the 0..1 range. */
export type Rgb = readonly [number, number, number];

/** A CSS-style hexadecimal colour such as `#49a2ff`. */
export type HexColor = string;

/** A colour stop on a 0..1 ramp. */
export interface ColorStop {
  at: number;
  color: HexColor;
}

/** A normalised ring gap/band used by procedural annuli. */
export interface RingBand {
  start: number;
  end: number;
  opacity: number;
}

/** A palette produced from a deterministic seed. */
export interface Palette {
  seed: number;
  base: HexColor;
  accent: HexColor;
  highlight: HexColor;
  shadow: HexColor;
  glow: HexColor;
  colors: HexColor[];
}

/** Tunable parameters for value-noise based surface detail. */
export interface NoiseParams {
  /** Base spatial frequency of the primary noise field. */
  scale: number;
  /** Spatial frequency of the secondary detail field. */
  detailScale: number;
  /** Number of fractal octaves. */
  octaves: number;
  /** Frequency multiplier between successive octaves. */
  lacunarity: number;
  /** Amplitude multiplier between successive octaves. */
  gain: number;
  /** Amount of domain warp applied before sampling. */
  warp: number;
  /** Coverage threshold used by masks such as craters and clouds. */
  threshold: number;
}

/** Detail tiers ordered from least to most expensive. */
export type LodTier = 'impostor' | 'low' | 'medium' | 'high';

/** Geometry resolution associated with a level of detail. */
export interface LodGeometry {
  segments: number;
  rings: number;
  ringSegments: number;
  atmosphereSegments: number;
}

/** A shader uniform entry shaped like the object Three.js expects. */
export interface UniformEntry<T extends number | Rgb = number | Rgb> {
  value: T;
}

export type UniformRecord<K extends string = string> = Record<K, UniformEntry>;
