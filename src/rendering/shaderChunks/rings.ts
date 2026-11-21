/** GLSL ring annulus alpha masks. Requires GLSL_NOISE_CHUNK. */

export const GLSL_RINGS_CHUNK = /* glsl */ `
float ringBandMask(float radius, float start, float end, float feather) {
  float rise = smoothstep(start - feather, start + feather, radius);
  float fall = 1.0 - smoothstep(end - feather, end + feather, radius);
  return rise * fall;
}

float ringAlpha(vec3 localPosition, float innerRadius, float outerRadius, float seed) {
  float width = max(outerRadius - innerRadius, 0.0001);
  float radius = clamp((length(localPosition.xz) - innerRadius) / width, 0.0, 1.0);
  float alpha = 0.0;
  alpha = max(alpha, ringBandMask(radius, 0.00, 0.17, 0.02) * 0.35);
  alpha = max(alpha, ringBandMask(radius, 0.19, 0.42, 0.015) * 0.90);
  alpha = max(alpha, ringBandMask(radius, 0.45, 0.52, 0.012) * 0.40);
  alpha = max(alpha, ringBandMask(radius, 0.55, 0.88, 0.02) * 0.75);
  alpha = max(alpha, ringBandMask(radius, 0.91, 1.00, 0.015) * 0.30);
  alpha *= 0.85 + 0.15 * renderNoise(vec3(radius * 90.0, seed, 0.0));
  return clamp(alpha, 0.0, 1.0);
}
`;
