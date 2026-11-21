import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MaterialPreset } from '../../types/celestial';

const vertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPositionW = worldPosition.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform vec3 uLight;
  uniform float uTime;
  uniform float uStyle;
  uniform float uEmissive;
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 p = normalize(vLocal);
    float terrain = fbm(p * 5.5);
    float detail = fbm(p * 18.0 + terrain * 2.0);
    vec3 surface = uColor;

    if (uStyle < 0.5) {
      surface = mix(uAccent, uColor, smoothstep(0.28, 0.72, terrain));
      surface *= 0.82 + detail * 0.35;
      float crater = smoothstep(0.62, 0.78, fbm(p * 26.0));
      surface *= 1.0 - crater * 0.28;
    } else if (uStyle < 1.5) {
      float dunes = sin(p.x * 38.0 + terrain * 8.0) * 0.08;
      surface = mix(uAccent, uColor, smoothstep(0.3, 0.7, terrain + dunes));
    } else if (uStyle < 2.5) {
      float land = smoothstep(0.5, 0.58, terrain);
      surface = mix(uColor, uAccent, land);
      surface *= 0.9 + detail * 0.2;
    } else if (uStyle < 3.5) {
      surface = mix(uAccent, uColor, smoothstep(0.32, 0.68, terrain));
      surface = mix(surface, vec3(0.95), smoothstep(0.72, 0.9, terrain) * 0.4);
    } else if (uStyle < 4.5) {
      float bands = sin(p.y * 34.0 + fbm(p * 3.0) * 6.0) * 0.5 + 0.5;
      float storms = smoothstep(0.7, 0.86, fbm(p * 9.0 + uTime * 0.01));
      surface = mix(uAccent, uColor, bands);
      surface = mix(surface, vec3(0.94, 0.86, 0.74), storms * 0.55);
    } else if (uStyle < 5.5) {
      float clouds = smoothstep(0.45, 0.75, fbm(p * 7.0 + uTime * 0.015));
      surface = mix(uAccent, uColor, clouds);
    } else if (uStyle < 6.5) {
      float lava = smoothstep(0.68, 0.82, fbm(p * 11.0 + uTime * 0.02));
      surface = mix(uAccent * 0.35, uColor * 0.65, terrain);
      surface += uAccent * lava * 1.8;
    } else if (uStyle < 7.5) {
      float bands = sin(p.y * 42.0) * 0.5 + 0.5;
      surface = mix(uAccent, uColor, bands);
      surface += vec3(0.25) * pow(max(dot(n, normalize(uLight - vPositionW)), 0.0), 3.0);
    } else if (uStyle < 8.5) {
      surface = mix(uAccent, uColor, fbm(p * 12.0));
      surface *= 0.85 + sin(vLocal.y * 90.0) * 0.05;
    } else {
      surface = mix(uAccent, uColor, fbm(p * 16.0 + uTime * 0.05));
    }

    vec3 lightDirection = normalize(uLight - vPositionW);
    float diffuse = max(dot(n, lightDirection), 0.0);
    float ambient = 0.09;
    float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vPositionW)), 0.0), 3.0);
    vec3 lit = surface * (ambient + diffuse * 1.05) + surface * rim * 0.22;
    lit += uAccent * uEmissive * (0.45 + 0.55 * fbm(p * 7.0 + uTime * 0.04));
    gl_FragColor = vec4(lit, 1.0);
  }
`;

const STYLE_INDEX: Record<MaterialPreset, number> = {
  rocky: 0,
  desert: 1,
  ocean: 2,
  ice: 3,
  'gas-giant': 4,
  clouded: 5,
  volcanic: 6,
  star: 7,
  metal: 8,
  comet: 9,
  singularity: 10,
};

export interface PlanetMaterialProps {
  color: string;
  accentColor: string;
  material: MaterialPreset;
  emissiveIntensity: number;
  lightPosition: [number, number, number];
  animate?: boolean;
}

export function PlanetMaterial({
  color,
  accentColor,
  material,
  emissiveIntensity,
  lightPosition,
  animate = true,
}: PlanetMaterialProps) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uAccent: { value: new THREE.Color(accentColor) },
      uLight: { value: new THREE.Vector3(...lightPosition) },
      uTime: { value: 0 },
      uStyle: { value: STYLE_INDEX[material] },
      uEmissive: { value: emissiveIntensity },
    }),
    // Uniform object identity must remain stable for the lifetime of the material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uColor.value.set(color);
    uniforms.uAccent.value.set(accentColor);
    uniforms.uStyle.value = STYLE_INDEX[material];
    uniforms.uEmissive.value = emissiveIntensity;
  }, [color, accentColor, material, emissiveIntensity, uniforms]);

  useEffect(() => {
    uniforms.uLight.value.set(...lightPosition);
  }, [lightPosition, uniforms]);

  useFrame((_, delta) => {
    if (animate && ref.current) ref.current.uniforms.uTime.value += delta;
  });

  return <shaderMaterial ref={ref} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />;
}
