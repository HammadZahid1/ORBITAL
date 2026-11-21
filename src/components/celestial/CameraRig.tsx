import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { bodyIndex, readVec3 } from '../../engine/physics/world';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface CameraRigProps {
  scale: SceneScale;
}

function isPhysicalMagnitude(tuple: readonly [number, number, number]): boolean {
  return Math.max(Math.abs(tuple[0]), Math.abs(tuple[1]), Math.abs(tuple[2])) > 1000;
}

function toSceneTuple(tuple: readonly [number, number, number], scale: SceneScale): [number, number, number] {
  if (!isPhysicalMagnitude(tuple)) return [tuple[0], tuple[1], tuple[2]];
  const point = scenePosition({ x: tuple[0], y: tuple[1], z: tuple[2] }, scale);
  return [point.x, point.y, point.z];
}

/** Orbit controls plus scenario/focus camera requests and optional body following. */
export function CameraRig({ scale }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const previousTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const cameraRequest = useSimulationStore((state) => state.cameraRequest);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const damping = useUIStore((state) => state.settings.cameraDamping);
  const autoFollow = useUIStore((state) => state.settings.autoFollow);

  useEffect(() => {
    if (!cameraRequest || !controls.current) return;
    const target = toSceneTuple(cameraRequest.target, scale);
    const position = toSceneTuple(cameraRequest.position, scale);
    controls.current.target.set(target[0], target[1], target[2]);
    camera.position.set(position[0], position[1], position[2]);
    previousTarget.current.copy(controls.current.target);
    controls.current.update();
  }, [camera, cameraRequest, scale]);

  useFrame(() => {
    if (!autoFollow || !selectedId || !controls.current) return;
    const index = bodyIndex(engine.world, selectedId);
    if (index < 0) return;
    const point = scenePosition(readVec3(engine.world.pos, index), scale);
    const next = new THREE.Vector3(point.x, point.y, point.z);
    const delta = next.clone().sub(controls.current.target);
    if (delta.lengthSq() < 1e-10 || delta.lengthSq() > 1e6) return;
    camera.position.add(delta);
    controls.current.target.copy(next);
    previousTarget.current.copy(next);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={Math.max(0.01, Math.min(1, damping))}
      minDistance={0.5}
      maxDistance={2000}
      zoomSpeed={0.85}
      rotateSpeed={0.7}
    />
  );
}
