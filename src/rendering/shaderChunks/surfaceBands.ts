/** GLSL latitude banding for gas giants and layered terrains. Requires GLSL_NOISE_CHUNK. */

export const GLSL_SURFACE_BANDS_CHUNK = /* glsl */ `
float surfaceBandPattern(vec3 p, float seed, float frequency) {
  float wobble = (renderFbm(p * 1.7 + seed, 3.0) - 0.5) * 1.4;
  return sin((p.y + wobble * 0.08) * frequency) * 0.5 + 0.5;
}

vec3 applySurfaceBands(vec3 base, vec3 accent, vec3 p, float seed, float frequency) {
  float bands = surfaceBandPattern(p, seed, frequency);
  float detail = renderFbm(p * 5.0 + seed, 4.0);
  float blend = clamp(bands * 0.85 + detail * 0.15, 0.0, 1.0);
  return mix(accent, base, blend);
}
`;
