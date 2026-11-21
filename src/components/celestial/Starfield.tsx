import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createRandom } from '../../engine/numeric';
import { useUIStore } from '../../state/uiStore';

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (300.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float distance = length(offset);
    if (distance > 0.5) discard;
    float core = smoothstep(0.5, 0.0, distance);
    gl_FragColor = vec4(vColor * (0.6 + core), core);
  }
`;

/** Deterministic decorative starfield; distances are visual, not physical. */
export function Starfield() {
  const { gl } = useThree();
  const density = useUIStore((state) => state.settings.performance.particleDensity);
  const visible = useUIStore((state) => state.layers.starfield.visible);
  const opacity = useUIStore((state) => state.layers.starfield.opacity);

  const geometry = useMemo(() => {
    const count = Math.max(200, Math.floor(4200 * density));
    const random = createRandom(0x51a25);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#bcd8ff'),
      new THREE.Color('#ffe4bd'),
      new THREE.Color('#d8c8ff'),
      new THREE.Color('#b8fff0'),
    ];

    for (let i = 0; i < count; i += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const radius = 420 + random() * 520;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const color = palette[Math.floor(random() * palette.length)];
      const brightness = 0.45 + random() * 0.55;
      colors[i * 3] = color.r * brightness;
      colors[i * 3 + 1] = color.g * brightness;
      colors[i * 3 + 2] = color.b * brightness;
      sizes[i] = random() < 0.04 ? 2.6 + random() * 2.2 : 0.7 + random() * 1.2;
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    result.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    result.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return result;
  }, [density]);

  const uniforms = useMemo(() => ({ uPixelRatio: { value: 1 } }), []);
  uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);

  if (!visible) return null;

  return (
    <points geometry={geometry} name="starfield">
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
