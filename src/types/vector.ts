/** A three-component Euclidean vector. Units are context-dependent (metres, m/s, m/s²). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A two-component vector used by charts and 2D visualisation layers. */
export interface Vec2 {
  x: number;
  y: number;
}

export const ZERO_VECTOR: Readonly<Vec3> = Object.freeze({ x: 0, y: 0, z: 0 });
