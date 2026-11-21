import { useRef } from 'react';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CelestialBody } from '../../types/celestial';
import type { SceneScale } from '../../engine/coordinates/scale';
import { sceneRadius } from '../../engine/coordinates/scale';
import { useLiveBodyTransform } from '../../hooks/useLiveBodyTransform';
import { useSimulationStore } from '../../state/simulationStore';
import { Atmosphere } from './Atmosphere';
import { BlackHole } from './BlackHole';
import { PlanetMaterial } from './PlanetMaterial';
import { RingSystem } from './RingSystem';

export interface CelestialBodyMeshProps {
  body: CelestialBody;
  scale: SceneScale;
  selected: boolean;
  hovered: boolean;
  lightPosition: [number, number, number];
  labelsVisible: boolean;
  showSelectionRing?: boolean;
}

/** A single physical body rendered from its visual profile and live solver state. */
export function CelestialBodyMesh({
  body,
  scale,
  selected,
  hovered,
  lightPosition,
  labelsVisible,
  showSelectionRing = true,
}: CelestialBodyMeshProps) {
  const group = useRef<THREE.Group>(null);
  const radius = sceneRadius(body, scale);
  const setSelected = useSimulationStore((state) => state.setSelected);
  const setHovered = useSimulationStore((state) => state.setHovered);

  useLiveBodyTransform(group, body.id, scale, body.physical.rotationSpeed);

  if (!body.visible) return null;

  const emissive = body.visual.emissiveIntensity * (body.type === 'star' ? 1.4 : 1);
  const material =
    body.type === 'blackhole' ? (
      <BlackHole radius={radius} intensity={0.7 + emissive * 0.2} />
    ) : (
      <mesh castShadow={radius > 0.6} receiveShadow={radius > 0.6}>
        <sphereGeometry args={[radius, radius > 1 ? 48 : 24, radius > 1 ? 32 : 16]} />
        <PlanetMaterial
          color={body.visual.color}
          accentColor={body.visual.emissive === '#000000' ? body.visual.color : body.visual.emissive}
          material={body.visual.material}
          emissiveIntensity={emissive}
          lightPosition={lightPosition}
        />
      </mesh>
    );

  return (
    <group
      ref={group}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(body.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = '';
      }}
      onClick={(event) => {
        event.stopPropagation();
        setSelected(body.id);
      }}
    >
      {material}
      {body.visual.atmosphere && body.type !== 'blackhole' && (
        <Atmosphere
          radius={radius}
          color={body.visual.atmosphereColor}
          intensity={0.7 + radius * 0.05}
        />
      )}
      {body.visual.rings && <RingSystem innerRadius={radius * 1.35} outerRadius={radius * 2.4} color={body.visual.ringColor} />}
      {(selected || hovered) && showSelectionRing && (
        <Billboard>
          <mesh renderOrder={3}>
            <ringGeometry args={[radius * 1.22, radius * 1.3, 48]} />
            <meshBasicMaterial
              color={selected ? '#55e0e8' : '#8b98ab'}
              transparent
              opacity={selected ? 0.95 : 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      )}
      {labelsVisible && body.visual.labelVisible && (
        <Html position={[0, radius * 1.55, 0]} center distanceFactor={28} zIndexRange={[20, 0]}>
          <div
            className="pointer-events-none select-none whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[10px] tracking-wide backdrop-blur-sm"
            style={{
              borderColor: selected ? 'rgba(85,224,232,0.65)' : 'rgba(32,41,57,0.9)',
              background: 'rgba(7,10,17,0.78)',
              color: selected ? '#55e0e8' : '#c8d2e0',
            }}
          >
            {body.name}
          </div>
        </Html>
      )}
    </group>
  );
}
