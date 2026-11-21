import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { hashString } from '../../engine/numeric';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface AsteroidBeltProps {
  scale: SceneScale;
}

/** Decorative seeded asteroid swarm. Individual simulated asteroids live in the solver. */
export function AsteroidBelt({ scale }: AsteroidBeltProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bodies = useSimulationStore((state) => state.bodies);
  const visible = useUIStore((state) => state.layers['asteroid-belts'].visible);
  const maxAsteroids = useUIStore((state) => state.settings.performance.maxAsteroids);

  const parent = useMemo(
    () => bodies.find((body) => body.type === 'star') ?? bodies[0],
    [bodies],
  );
  const seed = parent ? hashString(parent.id) : 1;

  const instances = useMemo(() => {
    const count = Math.min(maxAsteroids, 480);
    const random = hashString(`${seed}:belt`);
    let state = random;
    const next = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: count }, () => ({
      angle: next() * Math.PI * 2,
      radius: 0.55 + next() * 0.5 + (next() < 0.12 ? 0.3 : 0),
      height: (next() - 0.5) * 0.045,
      size: 0.018 + next() * 0.055,
      spin: next() * Math.PI,
    }));
  }, [maxAsteroids, seed]);

  useEffect(() => {
    if (!mesh.current || !parent) return;
    const dummy = new THREE.Object3D();
    const center = scenePosition(parent.physical.position, scale);
    instances.forEach((instance, i) => {
      dummy.position.set(
        center.x + Math.cos(instance.angle) * instance.radius * 50,
        center.y + instance.height * 50,
        center.z + Math.sin(instance.angle) * instance.radius * 50,
      );
      dummy.rotation.set(instance.spin, instance.angle, instance.spin * 0.5);
      dummy.scale.setScalar(instance.size);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [instances, parent, scale]);

  if (!visible || !parent || scale.mode === 'realistic') return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]} name="asteroid-belt">
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#8c8578" roughness={0.95} metalness={0.05} />
    </instancedMesh>
  );
}
