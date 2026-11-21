/** GLSL limb glow and additive halo helpers. No external chunk dependency. */

export const GLSL_GLOW_CHUNK = /* glsl */ `
float rimFactor(vec3 normalWorld, vec3 viewDirection) {
  vec3 n = normalize(normalWorld);
  vec3 v = normalize(viewDirection);
  return pow(1.0 - max(dot(n, v), 0.0), 3.0);
}

vec3 applyGlow(vec3 color, vec3 glowColor, float intensity, float rim) {
  float amount = clamp(intensity, 0.0, 4.0);
  return color + glowColor * amount * (0.35 + 0.65 * clamp(rim, 0.0, 1.0));
}

float glowFalloff(float distance, float scaleHeight) {
  float h = max(scaleHeight, 0.0001);
  return exp(-max(distance, 0.0) / h);
}
`;
