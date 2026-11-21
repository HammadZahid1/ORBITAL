import { useMemo } from 'react';
import * as THREE from 'three';

export interface RingSystemProps {
  innerRadius: number;
  outerRadius: number;
  color: string;
  opacity?: number;
  tilt?: number;
}

/** Declarative ring bands drawn as transparent annuli around a body. */
export function RingSystem({
  innerRadius,
  outerRadius,
  color,
  opacity = 0.7,
  tilt = 0.18,
}: RingSystemProps) {
  const bands = useMemo(
    () => [
      { start: 0, end: 0.17, opacity: 0.35 },
      { start: 0.19, end: 0.42, opacity: 0.9 },
      { start: 0.45, end: 0.52, opacity: 0.4 },
      { start: 0.55, end: 0.88, opacity: 0.75 },
      { start: 0.91, end: 1, opacity: 0.3 },
    ],
    [],
  );

  return (
    <group rotation={[Math.PI / 2 + tilt, 0, 0]}>
      {bands.map((band) => {
        const width = outerRadius - innerRadius;
        const bandInner = innerRadius + width * band.start;
        const bandOuter = innerRadius + width * band.end;
        return (
          <mesh key={band.start} renderOrder={1}>
            <ringGeometry args={[bandInner, bandOuter, 96]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity * band.opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
