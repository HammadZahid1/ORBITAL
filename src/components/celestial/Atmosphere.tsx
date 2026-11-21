import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vNormalW;
  varying vec3 vPositionW;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPositionW);
    float rim = 1.0 - max(dot(normalize(vNormalW), viewDirection), 0.0);
    float halo = pow(rim, 3.2) * uIntensity;
    float shimmer = 0.94 + 0.06 * sin(uTime * 0.7 + vPositionW.y * 2.0);
    gl_FragColor = vec4(uColor * (0.8 + halo), halo * 0.62 * shimmer);
  }
`;

export interface AtmosphereProps {
  radius: number;
  color: string;
  intensity?: number;
  animate?: boolean;
}

/** Lightweight procedural limb glow. This is a visual effect, not atmospheric physics. */
export function Atmosphere({ radius, color, intensity = 1, animate = true }: AtmosphereProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
    }),
    // Uniform objects remain stable; values are synchronised in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uColor.value.set(color);
    uniforms.uIntensity.value = intensity;
  }, [color, intensity, uniforms]);

  useFrame((_, delta) => {
    if (animate && material.current) material.current.uniforms.uTime.value += delta;
  });

  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[radius * 1.055, 24, 16]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
