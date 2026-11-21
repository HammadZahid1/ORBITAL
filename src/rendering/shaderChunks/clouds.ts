/** GLSL drifting cloud coverage. Requires GLSL_NOISE_CHUNK. */

export const GLSL_CLOUDS_CHUNK = /* glsl */ `
float cloudCoverage(vec3 p, float time, float speed, float threshold) {
  float drift = time * speed;
  vec3 samplePoint = p * 4.0 + vec3(drift * 0.2, 0.0, drift * 0.1);
  float field = renderFbm(samplePoint, 4.0);
  return smoothstep(threshold, threshold + 0.28, field);
}

vec3 applyClouds(vec3 surface, vec3 cloudColor, float coverage) {
  return mix(surface, cloudColor, clamp(coverage, 0.0, 1.0));
}
`;
