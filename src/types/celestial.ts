import type { Vec3 } from './vector';

/** Supported celestial object classifications. */
export type BodyType =
  | 'star'
  | 'planet'
  | 'dwarf'
  | 'moon'
  | 'asteroid'
  | 'comet'
  | 'custom'
  | 'blackhole';

/** Procedural surface presets. These are illustrative, not photographic. */
export type MaterialPreset =
  | 'rocky'
  | 'desert'
  | 'ocean'
  | 'ice'
  | 'gas-giant'
  | 'clouded'
  | 'volcanic'
  | 'star'
  | 'metal'
  | 'comet'
  | 'singularity';

/** Configuration for the historical trajectory of one body. */
export interface TrailConfig {
  enabled: boolean;
  length: number;
  opacity: number;
  color: string | null;
}

/** Physical simulation state. Never read directly for rendering scale. */
export interface PhysicalProperties {
  /** Kilograms. */
  mass: number;
  /** Metres. */
  radius: number;
  /** Metres in the simulation's inertial frame. */
  position: Vec3;
  /** Metres per second in the simulation's inertial frame. */
  velocity: Vec3;
  /** Metres per second squared, most recent solver result. */
  acceleration: Vec3;
  /** Current spin angle in radians. */
  rotation: number;
  /** Spin rate in radians per second. */
  rotationSpeed: number;
}

/** Purely presentational properties. Changes must not affect the solver. */
export interface VisualProperties {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  material: MaterialPreset;
  /** Multiplier applied to the drawn radius only. */
  visualScale: number;
  opacity: number;
  atmosphere: boolean;
  atmosphereColor: string;
  rings: boolean;
  ringColor: string;
  trail: TrailConfig;
  labelVisible: boolean;
}

/** A celestial body definition, combining physical state and presentation. */
export interface CelestialBody {
  id: string;
  name: string;
  type: BodyType;
  /** Parent identifier used for hierarchical display and relative orbital analysis. */
  parentId: string | null;
  physical: PhysicalProperties;
  visual: VisualProperties;
  visible: boolean;
  /** Locked bodies are not advanced by the integrator (useful for anchored primaries). */
  locked: boolean;
  notes: string;
}

/** A complete, serialisable simulation universe. */
export interface Universe {
  id: string;
  name: string;
  description: string;
  bodies: CelestialBody[];
  settings: UniverseSettings;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface UniverseSettings {
  /** Gravitational constant in m³ kg⁻¹ s⁻². */
  G: number;
  /** Plummer-style softening length in metres. */
  softening: number;
  /** Base solver step in seconds. */
  timestep: number;
  integrator: IntegratorId;
  collisionMode: CollisionMode;
  collisionsEnabled: boolean;
  /** Simulation seconds represented by one real second at 1x speed. */
  timeScale: number;
}

export type CollisionMode = 'none' | 'elastic' | 'inelastic' | 'merge';

export type IntegratorId = 'euler' | 'semi-implicit-euler' | 'velocity-verlet' | 'rk4';

export type SimulationMode =
  | 'solar-system'
  | 'orbital'
  | 'gravity-lab'
  | 'universe-builder'
  | 'asteroids'
  | 'stellar'
  | 'extreme'
  | 'mission'
  | 'analytics';

/** Names of the major application workspaces. */
export type ModuleId =
  | 'explorer'
  | 'solar-system'
  | 'builder'
  | 'orbital'
  | 'gravity'
  | 'asteroids'
  | 'stellar'
  | 'extreme'
  | 'mission'
  | 'analytics'
  | 'saved';
