import { G } from '../engine/numeric';
import { stateFromElements } from '../engine/orbits/orbital';
import { vec3 } from '../engine/vector';
import type { BodyType, CelestialBody, MaterialPreset, VisualProperties } from '../types/celestial';
import type { Vec3 } from '../types/vector';
import { MATERIALS, suggestedMaterial, TYPE_COLORS } from './materials';

let counter = 0;

export function nextId(prefix = 'body'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultVisual(
  type: BodyType,
  material: MaterialPreset = suggestedMaterial(type),
  color?: string,
): VisualProperties {
  const definition = MATERIALS[material];
  const base = color ?? definition.baseColor;
  return {
    color: base,
    emissive: definition.emissive ? definition.accentColor : '#000000',
    emissiveIntensity: definition.emissive ? 1.4 : 0,
    material,
    visualScale: 1,
    opacity: 1,
    atmosphere: definition.atmosphere,
    atmosphereColor: base,
    rings: false,
    ringColor: '#cbb08a',
    trail: { enabled: type !== 'star', length: 240, opacity: 0.65, color: null },
    labelVisible: true,
  };
}

export interface BodyOptions {
  id?: string;
  name: string;
  type?: BodyType;
  mass?: number;
  radius?: number;
  position?: Vec3;
  velocity?: Vec3;
  rotationSpeed?: number;
  color?: string;
  material?: MaterialPreset;
  parentId?: string | null;
  locked?: boolean;
  notes?: string;
  visualScale?: number;
}

/** Creates a fully-formed celestial body from a compact set of options. */
export function createBody(options: BodyOptions): CelestialBody {
  const type = options.type ?? 'planet';
  const material = options.material ?? suggestedMaterial(type);
  const visual = defaultVisual(type, material, options.color);
  if (options.visualScale !== undefined) visual.visualScale = options.visualScale;
  return {
    id: options.id ?? nextId(type),
    name: options.name,
    type,
    parentId: options.parentId ?? null,
    physical: {
      mass: options.mass ?? 5.972e24,
      radius: options.radius ?? 6.371e6,
      position: options.position ?? vec3(),
      velocity: options.velocity ?? vec3(),
      acceleration: vec3(),
      rotation: 0,
      rotationSpeed: options.rotationSpeed ?? 0,
    },
    visual,
    visible: true,
    locked: options.locked ?? false,
    notes: options.notes ?? '',
  };
}

export interface OrbitalBodyOptions extends Omit<BodyOptions, 'position' | 'velocity'> {
  centralMass: number;
  semimajorAxis: number;
  eccentricity?: number;
  inclination?: number;
  longitudeOfAscendingNode?: number;
  argumentOfPeriapsis?: number;
  trueAnomaly?: number;
  direction?: 1 | -1;
  gravitationalConstant?: number;
}

/** Creates a body with Cartesian state derived from classical orbital elements. */
export function createOrbitalBody(options: OrbitalBodyOptions): CelestialBody {
  const state = stateFromElements({
    mu: (options.gravitationalConstant ?? G) * options.centralMass,
    semiMajorAxis: options.semimajorAxis,
    eccentricity: options.eccentricity ?? 0,
    inclination: options.inclination ?? 0,
    longitudeOfAscendingNode: options.longitudeOfAscendingNode ?? 0,
    argumentOfPeriapsis: options.argumentOfPeriapsis ?? 0,
    trueAnomaly: options.trueAnomaly ?? 0,
  });
  const direction = options.direction ?? 1;
  const { centralMass: _centralMass, ...rest } = options;
  void _centralMass;
  return createBody({
    ...rest,
    position: state.position,
    velocity: vec3(
      state.velocity.x * direction,
      state.velocity.y * direction,
      state.velocity.z * direction,
    ),
  });
}

export function duplicateBody(body: CelestialBody, suffix = 'copy'): CelestialBody {
  return {
    ...structuredClone(body),
    id: nextId(body.type),
    name: `${body.name} ${suffix}`,
    visual: { ...structuredClone(body.visual), trail: { ...body.visual.trail } },
  };
}

/** Validation used by the builder and by configuration import. */
export function validateBody(body: CelestialBody): string[] {
  const errors: string[] = [];
  if (!body.name?.trim()) errors.push('Name is required');
  if (!Number.isFinite(body.physical.mass) || body.physical.mass <= 0) errors.push('Mass must be positive');
  if (!Number.isFinite(body.physical.radius) || body.physical.radius <= 0) errors.push('Radius must be positive');
  for (const [label, vector] of [
    ['position', body.physical.position],
    ['velocity', body.physical.velocity],
  ] as const) {
    if (![vector.x, vector.y, vector.z].every(Number.isFinite)) errors.push(`${label} contains a non-finite value`);
  }
  if (!Number.isFinite(body.visual.visualScale) || body.visual.visualScale <= 0) {
    errors.push('Visual scale must be positive');
  }
  return errors;
}

export function bodyTypeLabel(type: BodyType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function colorForType(type: BodyType): string {
  return TYPE_COLORS[type];
}
