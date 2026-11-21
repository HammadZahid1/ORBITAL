import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { centerOfMass } from '../../engine/coordinates/barycenter';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface BarycenterMarkerProps {
  scale: SceneScale;
}

/** Marks the instantaneous centre of mass of the active N-body system. */
export function BarycenterMarker({ scale }: BarycenterMarkerProps) {
  const frame = useSimulationStore((state) => state.frame);
  const visible = useUIStore((state) => state.layers.barycenter.visible);
  const labelVisible = useUIStore((state) => state.layers.labels.visible);

  const position = useMemo(() => {
    return scenePosition(centerOfMass(engine.world), scale);
    // frame intentionally invalidates this cache when the mutable engine state advances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, scale]);

  if (!visible) return null;

  return (
    <group position={[position.x, position.y, position.z]} name="barycenter">
      <mesh>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshBasicMaterial color="#e9b56b" transparent opacity={0.9} />
      </mesh>
      {[0, Math.PI / 2].map((rotation) => (
        <mesh key={rotation} rotation={[rotation, 0, 0]}>
          <ringGeometry args={[0.42, 0.46, 40]} />
          <meshBasicMaterial color="#e9b56b" transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {labelVisible && (
        <Html center position={[0, 0.8, 0]} distanceFactor={26}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-sm border border-line bg-space/85 px-1.5 py-0.5 text-[10px] text-warn">
            barycentre
          </div>
        </Html>
      )}
    </group>
  );
}
