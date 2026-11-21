import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { readVec3 } from '../../engine/physics/world';
import { engine } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

const vertexShader = /* glsl */ `
  uniform vec3 uBodies[8];
  uniform float uMasses[8];
  uniform int uCount;
  varying vec2 vGrid;
  void main() {
    vec3 transformed = position;
    float dip = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i < uCount) {
        float d = distance(position.xy, uBodies[i].xy);
        dip -= uMasses[i] / (1.0 + d * d * 0.35);
      }
    }
    transformed.z += dip * 0.035;
    vGrid = position.xy * 0.12;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying vec2 vGrid;
  void main() {
    vec2 grid = abs(fract(vGrid - 0.5) - 0.5) / fwidth(vGrid);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    gl_FragColor = vec4(vec3(0.24, 0.55, 0.78) * (0.4 + line), line * uOpacity);
  }
`;

export interface SpacetimeGridProps {
  scale: SceneScale;
}

/**
 * Illustrative potential-well sheet. The deformation is a visual metaphor for
 * gravitational potential; it is not a numerical solution of general relativity.
 */
export function SpacetimeGrid({ scale }: SpacetimeGridProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const visible = useUIStore((state) => state.layers.spacetime.visible);
  const opacity = useUIStore((state) => state.layers.spacetime.opacity);
  const uniforms = useMemo(
    () => ({
      uBodies: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
      uMasses: { value: new Float32Array(8) },
      uCount: { value: 0 },
      uOpacity: { value: opacity },
    }),
    // Uniform identity must remain stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(() => {
    const world = engine.world;
    const count = Math.min(world.count, 8);
    for (let i = 0; i < count; i += 1) {
      const point = scenePosition(readVec3(world.pos, i), scale);
      uniforms.uBodies.value[i].set(point.x, -point.z, 0);
      uniforms.uMasses.value[i] = Math.log10(1 + world.mass[i] / 1e24) * 0.8;
    }
    uniforms.uCount.value = count;
    uniforms.uOpacity.value = opacity;
  });

  if (!visible) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} name="spacetime-sheet">
      <planeGeometry args={[160, 160, 120, 120]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
