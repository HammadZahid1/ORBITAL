import { describe, expect, it } from 'vitest';
import {
  ATMOSPHERE_PROFILES,
  CAMERA_DISTANCE_LIMITS,
  CAMERA_DISTANCE_PRESETS,
  DEFAULT_COMET_TAIL_RAMP,
  DEFAULT_RING_BANDS,
  GLSL_CLOUDS_CHUNK,
  GLSL_CRATERS_CHUNK,
  GLSL_GLOW_CHUNK,
  GLSL_NOISE_CHUNK,
  GLSL_RINGS_CHUNK,
  GLSL_SURFACE_BANDS_CHUNK,
  LAYER_OPACITY_PRESETS,
  LOD_GEOMETRY,
  LOD_THRESHOLDS,
  MATERIAL_STYLE_INDEX,
  MAX_GLOW_INTENSITY,
  NOISE_PRESETS,
  ORBIT_LINE_COLORS,
  ORBIT_LINE_OPACITY,
  QUALITY_OPACITY_SCALE,
  atmosphereFalloff,
  atmosphereOpacity,
  atmosphereProfileNames,
  bandIndexForLatitude,
  blackbodyRgb,
  buildAtmosphereUniforms,
  buildGlowUniforms,
  buildPlanetUniforms,
  buildRingUniforms,
  cameraDistanceForRadius,
  cameraFov,
  cameraPresetForRadius,
  clampCameraDistance,
  clampUnit,
  cometTailAlpha,
  cometTailColor,
  cometTailSamples,
  cometTailStops,
  emissiveIntensityFromLuminosity,
  generatePalette,
  glowColorFromLuminosity,
  glowIntensityFromLuminosity,
  hexToRgb,
  hslToRgb,
  isHexColor,
  layerOpacity,
  lerp,
  lodGeometryForRadius,
  lodRank,
  lodTierForRadius,
  luminance,
  mixHex,
  noisePreset,
  normalizedRingRadius,
  octaveFrequency,
  octaveWeights,
  opacityPresetEntries,
  orbitEmphasis,
  orbitLineBrightness,
  orbitLineStyle,
  paletteColorAt,
  paletteSeed,
  planetBandColors,
  rgbToCss,
  rgbToHex,
  ringAlpha,
  ringAlphaSamples,
  sampleBandColor,
  sampleRamp,
  scaleRgb,
  smoothstep,
  spectralClassFromTemperature,
  starColorFromTemperature,
  starColorProfile,
  tessellationBudget,
  uniformNumericValues,
} from '../rendering';
import type { MaterialPreset } from '../types/celestial';

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const MATERIALS: MaterialPreset[] = [
  'rocky',
  'desert',
  'ocean',
  'ice',
  'gas-giant',
  'clouded',
  'volcanic',
  'star',
  'metal',
  'comet',
  'singularity',
];

function expectHex(value: string): void {
  expect(value).toMatch(HEX_PATTERN);
}

function expectUnitRgb(value: readonly number[]): void {
  expect(value).toHaveLength(3);
  for (const channel of value) {
    expect(Number.isFinite(channel)).toBe(true);
    expect(channel).toBeGreaterThanOrEqual(0);
    expect(channel).toBeLessThanOrEqual(1);
  }
}

function isBalanced(source: string): boolean {
  let braces = 0;
  let parentheses = 0;
  for (const character of source) {
    if (character === '{') braces += 1;
    else if (character === '}') braces -= 1;
    else if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    if (braces < 0 || parentheses < 0) return false;
  }
  return braces === 0 && parentheses === 0;
}

function isMonotonic(values: readonly number[], direction: 'ascending' | 'descending'): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if (direction === 'ascending' && values[i]! < values[i - 1]!) return false;
    if (direction === 'descending' && values[i]! > values[i - 1]!) return false;
  }
  return true;
}

describe('colour and scalar utilities', () => {
  it('clamps scalars and interpolates with smoothstep', () => {
    expect(clampUnit(-2)).toBe(0);
    expect(clampUnit(3)).toBe(1);
    expect(clampUnit(Number.NaN)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 5)).toBe(10);
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(1, 1, 9)).toBe(1);
  });

  it('parses shorthand and long hexadecimal colours into finite RGB', () => {
    expectUnitRgb(hexToRgb('#fff'));
    expect(hexToRgb('#fff')).toEqual([1, 1, 1]);
    expectUnitRgb(hexToRgb('#49a2ff'));
    expect(hexToRgb('not-a-colour')).toEqual([0, 0, 0]);
    expect(isHexColor('#abc123')).toBe(true);
    expect(isHexColor('abc123')).toBe(false);
  });

  it('emits valid lowercase hexadecimal output for any channel state', () => {
    expect(rgbToHex([-1, 2, 0.5])).toBe('#00ff80');
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
    expectHex(rgbToHex([Number.NaN, Infinity, 0.25]));
  });

  it('mixes colours deterministically and hits both endpoints exactly', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#123456', '#abcdef', 0.4)).toBe(mixHex('#123456', '#abcdef', 0.4));
  });

  it('converts HSL to bounded RGB and handles non-finite inputs', () => {
    expect(rgbToHex(hslToRgb(0, 1, 0.5))).toBe('#ff0000');
    expectUnitRgb(hslToRgb(120, 0.8, 0.4));
    expectUnitRgb(hslToRgb(Number.NaN, Number.NaN, Number.NaN));
  });

  it('scales channels, computes luminance and formats CSS colours', () => {
    expectUnitRgb(scaleRgb([0.5, 0.5, 0.5], 4));
    expect(scaleRgb([0.5, 0.5, 0.5], -1)).toEqual([0, 0, 0]);
    expect(luminance([1, 1, 1])).toBe(1);
    expect(rgbToCss([1, 0, 0], 0.5)).toBe('rgba(255, 0, 0, 0.500)');
  });
});

describe('seeded palettes', () => {
  it('is deterministic for the same seed and name', () => {
    const first = generatePalette({ seed: 42, name: 'planet', count: 3 });
    const second = generatePalette({ seed: 42, name: 'planet', count: 3 });
    expect(first).toEqual(second);
    expect(paletteSeed(42, 'planet')).toBe(paletteSeed(42, 'planet'));
  });

  it('changes output when the seed or name changes', () => {
    const first = generatePalette({ seed: 1, name: 'world' });
    const second = generatePalette({ seed: 2, name: 'world' });
    const third = generatePalette({ seed: 1, name: 'star' });
    expect(first.base).not.toBe(second.base);
    expect(first.base).not.toBe(third.base);
  });

  it('emits only valid hex colours and respects the extra swatch count', () => {
    const palette = generatePalette({ seed: 7, count: 4, saturation: 0.8 });
    expect(palette.colors).toHaveLength(9);
    for (const color of palette.colors) expectHex(color);
    expect(generatePalette({ seed: 7, count: -3 }).colors).toHaveLength(5);
  });

  it('wraps palette indices and tolerates empty palettes', () => {
    const palette = generatePalette({ seed: 11, count: 2 });
    expect(paletteColorAt(palette, -1)).toBe(palette.colors[palette.colors.length - 1]);
    expect(paletteColorAt(palette, palette.colors.length)).toBe(palette.colors[0]);
    expect(paletteColorAt({ ...palette, colors: [] }, 4)).toBe('#000000');
  });
});

describe('stellar colour', () => {
  it('returns finite bounded RGB for extreme and non-finite temperatures', () => {
    for (const temperature of [0, 1000, 5778, 12000, 1e9, Number.NaN]) {
      expectUnitRgb(blackbodyRgb(temperature));
    }
  });

  it('produces deterministic valid hex colours', () => {
    expectHex(starColorFromTemperature(3000));
    expect(starColorFromTemperature(5778)).toBe(starColorFromTemperature(5778));
  });

  it('is redder when cool and bluer when hot', () => {
    const cool = blackbodyRgb(3000);
    const hot = blackbodyRgb(12000);
    expect(cool[0]!).toBeGreaterThan(cool[2]!);
    expect(hot[2]!).toBeGreaterThan(hot[0]!);
  });

  it('classifies spectral types and clamps reported temperature', () => {
    expect(spectralClassFromTemperature(40000)).toBe('O');
    expect(spectralClassFromTemperature(5778)).toBe('G');
    expect(spectralClassFromTemperature(8000)).toBe('A');
    expect(spectralClassFromTemperature(100)).toBe('M');
    const profile = starColorProfile(Number.NaN);
    expect(profile.temperature).toBe(5778);
    expectHex(profile.hex);
  });
});

describe('planet bands', () => {
  it('respects material and explicit band counts', () => {
    expect(planetBandColors({ base: '#123456', accent: '#abcdef', material: 'gas-giant', seed: 7 })).toHaveLength(12);
    expect(planetBandColors({ base: '#123456', accent: '#abcdef', count: 5 })).toHaveLength(5);
    expect(planetBandColors({ base: '#123456', accent: '#abcdef', count: 0 })).toHaveLength(2);
  });

  it('is deterministic and emits valid hex bands', () => {
    const config = { base: '#123456', accent: '#abcdef', material: 'ocean' as const, seed: 99 };
    const bands = planetBandColors(config);
    expect(bands).toEqual(planetBandColors(config));
    for (const band of bands) expectHex(band);
  });

  it('samples latitudes with clamped indices', () => {
    const bands = planetBandColors({ base: '#111111', accent: '#eeeeee', seed: 3 });
    expect(bandIndexForLatitude(bands, -1)).toBe(0);
    expect(bandIndexForLatitude(bands, 1)).toBe(bands.length - 1);
    expect(sampleBandColor(bands, Number.NaN)).toBe(bands[Math.floor(bands.length / 2)]);
    expect(sampleBandColor([], 0)).toBe('#000000');
  });
});

describe('noise presets', () => {
  it('defines finite, positive parameters for every material preset', () => {
    for (const material of MATERIALS) {
      const preset = NOISE_PRESETS[material];
      expect(preset.scale).toBeGreaterThan(0);
      expect(preset.detailScale).toBeGreaterThan(0);
      expect(preset.octaves).toBeGreaterThanOrEqual(1);
      expect(preset.lacunarity).toBeGreaterThan(1);
      expect(preset.gain).toBeGreaterThan(0);
      expect(preset.threshold).toBeGreaterThanOrEqual(0);
      expect(preset.threshold).toBeLessThanOrEqual(1);
      expect(Number.isFinite(MATERIAL_STYLE_INDEX[material])).toBe(true);
    }
  });

  it('returns defensive copies of presets', () => {
    const copy = noisePreset('rocky');
    copy.scale = -1;
    expect(NOISE_PRESETS.rocky.scale).toBe(5.5);
  });

  it('produces decreasing octave weights and increasing frequencies', () => {
    const weights = octaveWeights(NOISE_PRESETS.rocky);
    expect(weights[0]).toBe(1);
    expect(isMonotonic(weights, 'descending')).toBe(true);
    const frequencies = [0, 1, 2, 3].map((octave) => octaveFrequency(NOISE_PRESETS.rocky, octave));
    expect(isMonotonic(frequencies, 'ascending')).toBe(true);
  });
});

describe('GLSL shader chunks', () => {
  const chunks = {
    noise: GLSL_NOISE_CHUNK,
    surfaceBands: GLSL_SURFACE_BANDS_CHUNK,
    craters: GLSL_CRATERS_CHUNK,
    clouds: GLSL_CLOUDS_CHUNK,
    rings: GLSL_RINGS_CHUNK,
    glow: GLSL_GLOW_CHUNK,
  };

  it('exports six distinct non-empty chunk strings', () => {
    const values = Object.values(chunks);
    expect(values).toHaveLength(6);
    expect(new Set(values).size).toBe(6);
    for (const chunk of values) {
      expect(typeof chunk).toBe('string');
      expect(chunk.trim().length).toBeGreaterThan(20);
    }
  });

  it('has balanced braces and parentheses in every chunk', () => {
    for (const chunk of Object.values(chunks)) expect(isBalanced(chunk)).toBe(true);
  });

  it('declares float functions and uses vec3 in every chunk', () => {
    for (const chunk of Object.values(chunks)) {
      expect(chunk).toMatch(/\bfloat\s+\w+\s*\(/);
      expect(chunk).toContain('vec3');
    }
  });

  it('contains no placeholder tokens', () => {
    for (const chunk of Object.values(chunks)) expect(chunk).not.toMatch(/TODO|FIXME|PLACEHOLDER|XXX/i);
  });

  it('exposes the expected helper function names for each effect', () => {
    expect(chunks.noise).toContain('renderFbm');
    expect(chunks.surfaceBands).toContain('surfaceBandPattern');
    expect(chunks.craters).toContain('craterMask');
    expect(chunks.clouds).toContain('cloudCoverage');
    expect(chunks.rings).toContain('ringAlpha');
    expect(chunks.glow).toContain('rimFactor');
  });
});

describe('shader uniform builders', () => {
  it('builds complete planet uniforms with the expected style index', () => {
    const uniforms = buildPlanetUniforms({
      color: '#ff0000',
      accentColor: '#0000ff',
      material: 'gas-giant',
      emissiveIntensity: 0.5,
      lightPosition: [1, 2, 3],
    });
    expect(Object.keys(uniforms)).toHaveLength(6);
    expect(uniforms.uStyle.value).toBe(4);
    expect(uniforms.uLight.value).toEqual([1, 2, 3]);
    expectUnitRgb(uniforms.uColor.value as readonly number[]);
  });

  it('sanitises non-finite planet uniform inputs', () => {
    const uniforms = buildPlanetUniforms({
      color: '#123456',
      accentColor: '#abcdef',
      material: 'rocky',
      emissiveIntensity: Number.NaN,
      lightPosition: [Infinity, Number.NaN, -Infinity],
      time: Number.NaN,
    });
    expect(uniformNumericValues(uniforms).every(Number.isFinite)).toBe(true);
    expect(uniformNumericValues(uniforms)).toHaveLength(12);
  });

  it('builds deterministic atmosphere uniforms', () => {
    const input = { color: '#8ecbff', intensity: 0.7, time: 1.25 };
    expect(buildAtmosphereUniforms(input)).toEqual(buildAtmosphereUniforms(input));
  });

  it('builds finite ring and glow uniforms', () => {
    const ring = buildRingUniforms({ color: '#ffaa00', opacity: Number.NaN });
    const glow = buildGlowUniforms({ hot: '#ffffff', cool: '#ff5500', intensity: Infinity });
    expect(uniformNumericValues(ring).every(Number.isFinite)).toBe(true);
    expect(uniformNumericValues(glow).every(Number.isFinite)).toBe(true);
    expectUnitRgb(ring.uColor.value as readonly number[]);
    expectUnitRgb(glow.uCool.value as readonly number[]);
  });
});

describe('ring alpha profiles', () => {
  it('matches the component band layout and clamps normalized radii', () => {
    expect(DEFAULT_RING_BANDS).toHaveLength(5);
    expect(normalizedRingRadius(5, 1, 3)).toBe(1);
    expect(normalizedRingRadius(-1, 1, 3)).toBe(0);
    expect(normalizedRingRadius(Number.NaN, 1, 3)).toBe(0);
  });

  it('keeps alpha finite and bounded across the annulus', () => {
    for (let i = 0; i <= 50; i += 1) {
      const alpha = ringAlpha(i / 50);
      expect(Number.isFinite(alpha)).toBe(true);
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
    expect(ringAlpha(0.3)).toBeGreaterThan(ringAlpha(0.18));
    expect(ringAlpha(Number.NaN)).toBe(ringAlpha(0));
  });

  it('samples deterministic ring profiles', () => {
    const samples = ringAlphaSamples(11);
    expect(samples).toHaveLength(11);
    expect(samples.map((sample) => sample.alpha)).toEqual(ringAlphaSamples(11).map((sample) => sample.alpha));
    expect(ringAlphaSamples(Number.NaN)).toEqual([]);
  });
});

describe('atmosphere falloff profiles', () => {
  it('defines finite profile parameters', () => {
    for (const name of atmosphereProfileNames()) {
      expect(ATMOSPHERE_PROFILES[name].scaleHeight).toBeGreaterThan(0);
      expect(ATMOSPHERE_PROFILES[name].exponent).toBeGreaterThan(0);
    }
  });

  it('is finite, bounded and monotonically decreasing for every profile', () => {
    for (const profile of atmosphereProfileNames()) {
      const values = Array.from({ length: 21 }, (_, index) => atmosphereFalloff(index / 20, profile));
      expect(values.every(Number.isFinite)).toBe(true);
      expect(values.every((value) => value >= 0 && value <= 1)).toBe(true);
      expect(isMonotonic(values, 'descending')).toBe(true);
    }
  });

  it('clamps altitude and resolves non-finite input consistently', () => {
    for (const profile of atmosphereProfileNames()) {
      expect(atmosphereFalloff(-5, profile)).toBe(1);
      expect(atmosphereFalloff(Number.NaN, profile)).toBe(atmosphereFalloff(1, profile));
    }
  });

  it('scales opacity linearly with intensity and clamps to one', () => {
    expect(atmosphereOpacity(0.25, 0.5, 'linear')).toBeCloseTo(0.375, 10);
    expect(atmosphereOpacity(0, 10)).toBe(1);
    expect(atmosphereOpacity(0, Number.NaN)).toBe(0);
  });
});

describe('comet tail ramps', () => {
  it('emits valid deterministic hex colours and honours ramp endpoints', () => {
    expect(DEFAULT_COMET_TAIL_RAMP[0]!.color).toBe('#f4ffff');
    expect(cometTailColor(0)).toBe('#f4ffff');
    expect(cometTailColor(1)).toBe('#17233b');
    for (const t of [0, 0.2, 0.5, 0.9, Number.NaN]) expectHex(cometTailColor(t));
  });

  it('sorts unsorted stops without mutating input', () => {
    const stops = [
      { at: 1, color: '#ffffff' },
      { at: 0, color: '#000000' },
    ];
    expect(sampleRamp(stops, 0)).toBe('#000000');
    expect(stops[0]!.at).toBe(1);
    expect(sampleRamp([], 0.5)).toBe('#000000');
  });

  it('decreases tail alpha monotonically', () => {
    const alphas = Array.from({ length: 11 }, (_, index) => cometTailAlpha(index / 10));
    expect(alphas.every(Number.isFinite)).toBe(true);
    expect(isMonotonic(alphas, 'descending')).toBe(true);
    expect(cometTailAlpha(Number.NaN)).toBe(1);
  });

  it('samples colours and alphas together', () => {
    const samples = cometTailSamples(7);
    expect(samples).toHaveLength(7);
    for (const sample of samples) expectHex(sample.color);
    expect(isMonotonic(samples.map((sample) => sample.alpha), 'descending')).toBe(true);
    expect(cometTailSamples(-2)).toEqual([]);
    expect(cometTailStops('invalid')[1]!.color).toBe('#9fd8e8');
  });
});

describe('orbit line styling', () => {
  it('resolves emphasis with selection and hover priority', () => {
    expect(orbitEmphasis('a', 'a', 'b', true)).toBe('selected');
    expect(orbitEmphasis('a', null, 'a')).toBe('hovered');
    expect(orbitEmphasis('a', null, null, true)).toBe('parent');
    expect(orbitEmphasis('a', null, null)).toBe('normal');
  });

  it('uses valid colours and finite bounded opacities', () => {
    for (const emphasis of Object.keys(ORBIT_LINE_COLORS) as Array<keyof typeof ORBIT_LINE_COLORS>) {
      const style = orbitLineStyle(emphasis);
      expectHex(style.color);
      expect(style.opacity).toBeGreaterThanOrEqual(0);
      expect(style.opacity).toBeLessThanOrEqual(1);
      expect(Number.isFinite(ORBIT_LINE_OPACITY[emphasis])).toBe(true);
    }
  });

  it('scales opacity with the layer and highlights selected orbits', () => {
    expect(orbitLineStyle('normal', 0.5).opacity).toBeCloseTo(0.2, 10);
    expect(orbitLineStyle('normal', Number.NaN).opacity).toBe(0);
    expect(orbitLineBrightness('selected')).toBeGreaterThan(orbitLineBrightness('normal'));
  });
});

describe('glow from luminosity', () => {
  it('is zero for absent or invalid luminosity and stays bounded', () => {
    expect(glowIntensityFromLuminosity(0)).toBe(0);
    expect(glowIntensityFromLuminosity(-10)).toBe(0);
    expect(glowIntensityFromLuminosity(Number.NaN)).toBe(0);
    expect(glowIntensityFromLuminosity(1e40)).toBe(MAX_GLOW_INTENSITY);
  });

  it('increases monotonically with luminosity', () => {
    const values = [0, 1e23, 3.828e26, 1e30, 1e35].map(glowIntensityFromLuminosity);
    expect(isMonotonic(values, 'ascending')).toBe(true);
    expect(values.every(Number.isFinite)).toBe(true);
  });

  it('produces valid deterministic glow colours', () => {
    expect(glowColorFromLuminosity(0)).toBe('#ef5b23');
    expect(glowColorFromLuminosity(1e40)).toBe('#fff0c9');
    expectHex(glowColorFromLuminosity(3.828e26));
    expect(emissiveIntensityFromLuminosity(1e26)).toBe(glowIntensityFromLuminosity(1e26));
  });
});

describe('level of detail', () => {
  it('defines ascending thresholds and finite geometry', () => {
    expect(isMonotonic(LOD_THRESHOLDS.map((entry) => entry.minRadius), 'ascending')).toBe(true);
    for (const geometry of Object.values(LOD_GEOMETRY)) {
      for (const value of Object.values(geometry)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('selects non-decreasing tiers as radius grows', () => {
    expect(lodTierForRadius(0.05)).toBe('impostor');
    expect(lodTierForRadius(0.3)).toBe('low');
    expect(lodTierForRadius(0.8)).toBe('medium');
    expect(lodTierForRadius(2)).toBe('high');
    expect(lodTierForRadius(Number.NaN)).toBe('impostor');
    const ranks = [0, 0.1, 0.2, 0.5, 0.7, 1, 5].map((radius) => lodRank(lodTierForRadius(radius)));
    expect(isMonotonic(ranks, 'ascending')).toBe(true);
  });

  it('returns defensive geometry and a finite vertex budget', () => {
    const geometry = lodGeometryForRadius(2);
    geometry.segments = 1;
    expect(LOD_GEOMETRY.high.segments).toBe(48);
    expect(tessellationBudget(2)).toBeGreaterThan(0);
    expect(tessellationBudget(2)).toBe(tessellationBudget(2));
  });
});

describe('layer opacity presets', () => {
  it('defines a finite preset for every viewport layer', () => {
    for (const [layer, value] of Object.entries(LAYER_OPACITY_PRESETS)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(layer.length).toBeGreaterThan(0);
    }
    expect(opacityPresetEntries()).toHaveLength(Object.keys(LAYER_OPACITY_PRESETS).length);
  });

  it('scales with user opacity and render quality', () => {
    expect(layerOpacity('orbits', 'low', 1)).toBeCloseTo(0.32, 10);
    const values = [0, 0.5, 1].map((opacity) => layerOpacity('orbits', 'balanced', opacity));
    expect(isMonotonic(values, 'ascending')).toBe(true);
    expect(layerOpacity('bodies', 'balanced', Number.NaN)).toBe(0);
    for (const scale of Object.values(QUALITY_OPACITY_SCALE)) {
      expect(Number.isFinite(scale)).toBe(true);
      expect(scale).toBeGreaterThan(0);
    }
  });
});

describe('camera framing presets', () => {
  it('gives non-decreasing finite distances for every preset', () => {
    for (const preset of Object.keys(CAMERA_DISTANCE_PRESETS) as Array<keyof typeof CAMERA_DISTANCE_PRESETS>) {
      const distances = [0.1, 1, 10, 100].map((radius) => cameraDistanceForRadius(radius, preset));
      expect(distances.every(Number.isFinite)).toBe(true);
      expect(isMonotonic(distances, 'ascending')).toBe(true);
    }
  });

  it('clamps distances to the orbit-control limits', () => {
    expect(clampCameraDistance(Number.NaN)).toBe(CAMERA_DISTANCE_LIMITS.min);
    expect(clampCameraDistance(-100)).toBe(CAMERA_DISTANCE_LIMITS.min);
    expect(clampCameraDistance(1e9)).toBe(CAMERA_DISTANCE_LIMITS.max);
    expect(cameraDistanceForRadius(Number.NaN)).toBeGreaterThanOrEqual(CAMERA_DISTANCE_LIMITS.min);
  });

  it('selects wider presets for larger bodies with finite fields of view', () => {
    const rank = { surface: 0, close: 1, moon: 2, planet: 3, system: 4, overview: 5 } as const;
    const presets = [0.1, 0.3, 0.7, 3, 20, 100].map(cameraPresetForRadius);
    expect(isMonotonic(presets.map((preset) => rank[preset]), 'ascending')).toBe(true);
    for (const preset of Object.keys(CAMERA_DISTANCE_PRESETS) as Array<keyof typeof CAMERA_DISTANCE_PRESETS>) {
      expect(Number.isFinite(cameraFov(preset))).toBe(true);
      expect(CAMERA_DISTANCE_PRESETS[preset].factor).toBeGreaterThan(0);
    }
  });
});
