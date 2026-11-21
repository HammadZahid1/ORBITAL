import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const diskVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    vUv = uv;
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const diskFragment = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform vec3 uHot;
  uniform vec3 uCool;
  varying vec2 vUv;
  varying vec3 vLocal;

  void main() {
    float radius = length(vLocal.xy);
    float angle = atan(vLocal.y, vLocal.x);
    float swirl = sin(angle * 7.0 - uTime * 2.4 + radius * 9.0) * 0.5 + 0.5;
    float bands = sin(radius * 24.0 - uTime * 3.0) * 0.5 + 0.5;
    float falloff = smoothstep(1.0, 0.25, radius);
    vec3 color = mix(uCool, uHot, swirl * 0.6 + bands * 0.4);
    gl_FragColor = vec4(color * (1.0 + bands * 0.7), falloff * 0.85);
  }
`;

export interface BlackHoleProps {
  radius: number;
  intensity?: number;
}

/**
 * Educational black-hole visualisation. The shading suggests lensing and an
 * accretion disc but does not solve general relativity or ray-trace photons.
 */
export function BlackHole({ radius, intensity = 1 }: BlackHoleProps) {
  const disk = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHot: { value: new THREE.Color('#fff0c9') },
      uCool: { value: new THREE.Color('#ef5b23') },
    }),
    [],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    if (disk.current) disk.current.rotation.z += delta * 0.16;
    if (material.current) material.current.uniforms.uTime.value = uniforms.uTime.value;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.2, 0]} ref={disk}>
        <ringGeometry args={[radius * 1.35, radius * 4.2, 128, 1]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={diskVertex}
          fragmentShader={diskFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.22, 32, 24]} />
        <meshBasicMaterial
          color={new THREE.Color('#ffb066')}
          transparent
          opacity={0.16 * intensity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
