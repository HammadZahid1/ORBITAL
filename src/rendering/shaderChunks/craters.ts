/** GLSL crater masks for rocky surfaces. Requires GLSL_NOISE_CHUNK. */

export const GLSL_CRATERS_CHUNK = /* glsl */ `
float craterField(vec3 p, float seed) {
  return renderFbm(p * 7.0 + seed, 4.0);
}

float craterMask(vec3 p, float seed, float threshold) {
  float field = craterField(p, seed);
  return smoothstep(threshold, threshold + 0.12, field);
}

vec3 applyCraters(vec3 surface, vec3 p, float seed, float threshold, float depth) {
  return surface * (1.0 - craterMask(p, seed, threshold) * clamp(depth, 0.0, 1.0));
}
`;
