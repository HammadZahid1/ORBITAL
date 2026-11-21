import type { Vec3 } from '../../types/vector';
import { clamp } from '../numeric';
import type { PhysicsWorld } from '../physics/world';
import { cross3, dot3, length3, scale3, sub3, vec3 } from '../vector';

/** Two-body Keplerian elements derived from an instantaneous simulation state. */
export interface OrbitalElements {
  /** Gravitational parameter of the pair, m³/s². */
  mu: number;
  /** Relative position of the orbiting body, metres. */
  relativePosition: Vec3;
  /** Relative velocity, m/s. */
  relativeVelocity: Vec3;
  /** Current separation, metres. */
  radius: number;
  /** Current relative speed, m/s. */
  speed: number;
  /** Specific orbital energy, J/kg. */
  specificEnergy: number;
  /** Specific angular momentum vector, m²/s. */
  specificAngularMomentum: Vec3;
  angularMomentumMagnitude: number;
  eccentricity: number;
  eccentricityVector: Vec3;
  semiMajorAxis: number;
  semiLatusRectum: number;
  periapsis: number;
  apoapsis: number;
  /** Seconds; Infinity for unbound trajectories. */
  period: number;
  /** Radians, measured from the +Y reference direction. */
  inclination: number;
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  trueAnomaly: number;
  isBound: boolean;
  isCircular: boolean;
}

const UP: Vec3 = vec3(0, 1, 0);

function angleWithSign(cosine: number, sign: number): number {
  const base = Math.acos(clamp(cosine, -1, 1));
  return sign >= 0 ? base : 2 * Math.PI - base;
}

/**
 * Computes osculating Keplerian elements for body `index` around `centralIndex`.
 *
 * The result is an instantaneous two-body approximation of the full N-body
 * state: it ignores perturbations from all other bodies. Bound orbits use the
 * standard vis-viva relations; hyperbolic trajectories report an infinite
 * period and apoapsis.
 */
export function calculateOrbitalElements(
  world: PhysicsWorld,
  index: number,
  centralIndex: number,
): OrbitalElements | null {
  if (
    index === centralIndex ||
    index < 0 ||
    centralIndex < 0 ||
    index >= world.count ||
    centralIndex >= world.count
  ) {
    return null;
  }

  const r = sub3(
    { x: world.pos[index * 3], y: world.pos[index * 3 + 1], z: world.pos[index * 3 + 2] },
    { x: world.pos[centralIndex * 3], y: world.pos[centralIndex * 3 + 1], z: world.pos[centralIndex * 3 + 2] },
  );
  const v = sub3(
    { x: world.vel[index * 3], y: world.vel[index * 3 + 1], z: world.vel[index * 3 + 2] },
    { x: world.vel[centralIndex * 3], y: world.vel[centralIndex * 3 + 1], z: world.vel[centralIndex * 3 + 2] },
  );

  const radius = length3(r);
  const speed = length3(v);
  if (radius <= 0) return null;

  const mu = Math.max(world.G * (world.mass[index] + world.mass[centralIndex]), 1e-30);
  const h = cross3(r, v);
  const hMagnitude = length3(h);
  const node = cross3(UP, h);
  const nodeMagnitude = length3(node);
  const eVec = sub3(scale3(cross3(v, h), 1 / mu), scale3(r, 1 / radius));
  const eccentricity = length3(eVec);
  const specificEnergy = (speed * speed) / 2 - mu / radius;
  const isBound = specificEnergy < 0 && eccentricity < 1;
  const semiMajorAxis = isBound ? -mu / (2 * specificEnergy) : Infinity;
  const semiLatusRectum = (hMagnitude * hMagnitude) / mu;

  return {
    mu,
    relativePosition: r,
    relativeVelocity: v,
    radius,
    speed,
    specificEnergy,
    specificAngularMomentum: h,
    angularMomentumMagnitude: hMagnitude,
    eccentricity,
    eccentricityVector: eVec,
    semiMajorAxis,
    semiLatusRectum,
    periapsis: semiLatusRectum / (1 + eccentricity),
    apoapsis: eccentricity < 1 ? semiLatusRectum / (1 - eccentricity) : Infinity,
    period: isBound ? 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / mu) : Infinity,
    inclination: Math.acos(clamp(hMagnitude > 0 ? h.y / hMagnitude : 0, -1, 1)),
    longitudeOfAscendingNode: nodeMagnitude > 1e-12 ? Math.atan2(node.z, node.x) : 0,
    argumentOfPeriapsis:
      nodeMagnitude > 1e-12 && eccentricity > 1e-12
        ? angleWithSign(dot3(node, eVec) / (nodeMagnitude * eccentricity), eVec.y)
        : 0,
    trueAnomaly:
      eccentricity > 1e-12
        ? angleWithSign(dot3(eVec, r) / (eccentricity * radius), dot3(r, v) < 0)
        : nodeMagnitude > 1e-12
          ? angleWithSign(dot3(node, r) / (nodeMagnitude * radius), r.y < 0)
          : 0,
    isBound,
    isCircular: eccentricity < 0.02,
  };
}

/** Speed on a circular orbit at radius r around a mass with parameter μ. */
export function circularOrbitVelocity(mu: number, radius: number): number {
  return radius > 0 ? Math.sqrt(mu / radius) : 0;
}

/** Speed required to escape from radius r with zero excess energy. */
export function escapeVelocity(mu: number, radius: number): number {
  return radius > 0 ? Math.sqrt((2 * mu) / radius) : 0;
}

/** Kepler's third law for a bound orbit. */
export function orbitalPeriod(semiMajorAxis: number, mu: number): number {
  return semiMajorAxis > 0 && mu > 0 ? 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / mu) : Infinity;
}

/** Speed from the vis-viva equation at separation r. */
export function visVivaSpeed(mu: number, radius: number, semiMajorAxis: number): number {
  if (radius <= 0) return 0;
  const term = 2 / radius - (Number.isFinite(semiMajorAxis) ? 1 / semiMajorAxis : 0);
  return Math.sqrt(Math.max(mu * term, 0));
}

export interface KeplerState {
  mu: number;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  trueAnomaly: number;
}

function rotateY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

function rotateX(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}

/**
 * Converts classical orbital elements into Cartesian position and velocity
 * relative to the attracting body. Uses a Y-up reference frame so that zero
 * inclination places the orbit in the X–Z plane.
 */
export function stateFromElements(elements: KeplerState): { position: Vec3; velocity: Vec3 } {
  const e = clamp(elements.eccentricity, 0, 0.999999);
  const a = Math.max(elements.semiMajorAxis, 1e-6);
  const p = a * (1 - e * e);
  const nu = elements.trueAnomaly;
  const radius = p / (1 + e * Math.cos(nu));
  const speedFactor = Math.sqrt(Math.max(elements.mu, 1e-30) / p);

  // Negative Z component gives a prograde orbit with angular momentum along +Y.
  const position = vec3(radius * Math.cos(nu), 0, -radius * Math.sin(nu));
  const velocity = vec3(-speedFactor * Math.sin(nu), 0, -speedFactor * (e + Math.cos(nu)));

  const rotate = (v: Vec3): Vec3 =>
    rotateY(
      rotateX(rotateY(v, elements.argumentOfPeriapsis), elements.inclination),
      elements.longitudeOfAscendingNode,
    );

  return { position: rotate(position), velocity: rotate(velocity) };
}

/** Sample a full Keplerian ellipse for visualisation (Y-up plane). */
export function sampleEllipse(elements: KeplerState, samples = 128): Vec3[] {
  const points: Vec3[] = [];
  const e = clamp(elements.eccentricity, 0, 0.999999);
  const a = Math.max(elements.semiMajorAxis, 1e-6);
  const p = a * (1 - e * e);
  for (let i = 0; i <= samples; i += 1) {
    const nu = (i / samples) * Math.PI * 2;
    const radius = p / (1 + e * Math.cos(nu));
    const base = vec3(radius * Math.cos(nu), 0, -radius * Math.sin(nu));
    points.push(
      rotateY(
        rotateX(rotateY(base, elements.argumentOfPeriapsis), elements.inclination),
        elements.longitudeOfAscendingNode,
      ),
    );
  }
  return points;
}
