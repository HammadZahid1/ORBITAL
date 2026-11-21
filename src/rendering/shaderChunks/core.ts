/** Shared GLSL value-noise primitives used by the other shader chunks. */

export const GLSL_NOISE_CHUNK = /* glsl */ `
float renderHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float renderNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(renderHash(i), renderHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(renderHash(i + vec3(0.0, 1.0, 0.0)), renderHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(renderHash(i + vec3(0.0, 0.0, 1.0)), renderHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(renderHash(i + vec3(0.0, 1.0, 1.0)), renderHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

float renderFbm(vec3 p, float octaves) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) break;
    total += amplitude * renderNoise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return total;
}
`;
