import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import type { CelestialBody } from '../../types/celestial';
import { createSceneScale, scenePosition } from '../../engine/coordinates/scale';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { AsteroidBelt } from './AsteroidBelt';
import { BarycenterMarker } from './BarycenterMarker';
import { BodyLayer } from './BodyLayer';
import { CameraRig } from './CameraRig';
import { CometTails } from './CometTails';
import { GravityFieldArrows } from './GravityFieldArrows';
import { OrbitPaths } from './OrbitPaths';
import { SpacetimeGrid } from './SpacetimeGrid';
import { Starfield } from './Starfield';
import { TrajectoryLines } from './TrajectoryLines';
import { VectorGlyphs } from './VectorGlyphs';

function SceneContents({ bodies }: { bodies: CelestialBody[] }) {
  const mode = useUIStore((state) => state.scaleMode);
  const layers = useUIStore((state) => state.layers);
  const scale = useMemo(() => createSceneScale(bodies, mode), [bodies, mode]);
  const light = useMemo(() => {
    const primary = bodies.find((body) => body.type === 'star') ?? bodies[0];
    if (!primary) return [20, 20, 20] as [number, number, number];
    const point = scenePosition(primary.physical.position, scale);
    return [point.x + 12, point.y + 18, point.z + 10] as [number, number, number];
  }, [bodies, scale]);

  return (
    <>
      <color attach="background" args={['#04060a']} />
      <fog attach="fog" args={['#04060a', 220, 900]} />
      <ambientLight intensity={0.18} />
      <pointLight position={light} intensity={120} distance={600} decay={1.6} color="#fff2dd" />
      <Starfield />
      {layers.grid.visible && (
        <gridHelper
          args={[200, 40, '#263449', '#131b28']}
          position={[0, -4, 0]}
          material-transparent
          material-opacity={layers.grid.opacity}
        />
      )}
      <SpacetimeGrid scale={scale} />
      <AsteroidBelt scale={scale} />
      <OrbitPaths scale={scale} />
      <TrajectoryLines scale={scale} />
      <CometTails scale={scale} />
      <BodyLayer scale={scale} />
      <VectorGlyphs scale={scale} />
      <GravityFieldArrows scale={scale} />
      <BarycenterMarker scale={scale} />
      <CameraRig scale={scale} />
      <AdaptiveDpr pixelated />
    </>
  );
}

/** Main 3D universe viewport. All body motion is driven by the shared solver. */
export function SpaceScene() {
  const bodies = useSimulationStore((state) => state.bodies);
  const setSelected = useSimulationStore((state) => state.setSelected);
  const reduceMotion = useUIStore((state) => state.settings.reduceMotion);
  const pixelRatioCap = useUIStore((state) => state.settings.performance.pixelRatioCap);

  return (
    <Canvas
      dpr={[1, Math.min(pixelRatioCap, 2)]}
      camera={{ position: [42, 26, 48], fov: 52, near: 0.05, far: 2400 }}
      gl={{ antialias: !reduceMotion, powerPreference: 'high-performance', alpha: false }}
      onPointerMissed={() => setSelected(null)}
      shadows={useUIStore.getState().settings.performance.shadows}
    >
      <SceneContents bodies={bodies} />
    </Canvas>
  );
}
