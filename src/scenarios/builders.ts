import { createBody, createOrbitalBody } from '../data/bodyFactory';
import { AU, DAY, EARTH_MASS, EARTH_RADIUS, G, SOLAR_MASS } from '../engine/numeric';
import type { CelestialBody, Universe } from '../types/celestial';
import type { Scenario } from './types';

export interface ScenarioBaseOptions {
  id: string;
  name: string;
  description: string;
  category: Scenario['category'];
  educationalNotes: string;
  bodies: CelestialBody[];
  timestep?: number;
  timeScale?: number;
  integrator?: Universe['settings']['integrator'];
  collisionMode?: Universe['settings']['collisionMode'];
  collisionsEnabled?: boolean;
  camera?: Partial<Scenario['camera']>;
  tags?: string[];
}

export function makeScenario(options: ScenarioBaseOptions): Scenario {
  const now = Date.now();
  const universe: Universe = {
    id: `universe-${options.id}`,
    name: options.name,
    description: options.description,
    bodies: options.bodies,
    settings: {
      G,
      softening: 1e5,
      timestep: options.timestep ?? 3600,
      integrator: options.integrator ?? 'velocity-verlet',
      collisionMode: options.collisionMode ?? 'none',
      collisionsEnabled: options.collisionsEnabled ?? false,
      timeScale: options.timeScale ?? 3600,
    },
    createdAt: now,
    updatedAt: now,
    tags: options.tags ?? [options.category],
  };
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: options.category,
    educationalNotes: options.educationalNotes,
    universe,
    camera: {
      position: [0, 38, 62],
      target: [0, 0, 0],
      suggestedDistance: 70,
      ...options.camera,
    },
    layers: {},
    tags: options.tags ?? [options.category],
  };
}

export function earthMoonSystem(): Scenario {
  const earth = createBody({
    id: 'earth',
    name: 'Earth',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ocean',
    color: '#3d86c4',
    rotationSpeed: (2 * Math.PI) / DAY,
    locked: true,
    notes: 'Anchored primary for a clean two-body demonstration.',
  });
  const moonDistance = 3.844e8;
  const moon = createBody({
    id: 'moon',
    name: 'Moon',
    type: 'moon',
    mass: 7.346e22,
    radius: 1.7374e6,
    material: 'rocky',
    color: '#c8c8c4',
    position: { x: moonDistance, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -Math.sqrt((G * EARTH_MASS) / moonDistance) },
    parentId: 'earth',
  });
  return makeScenario({
    id: 'earth-moon',
    name: 'Earth–Moon System',
    description: 'A two-body gravitational experiment using approximate lunar initial conditions.',
    category: 'orbital',
    educationalNotes:
      'Earth is anchored, so the pair does not orbit a shared barycentre. Remove the lock to see the barycentre remain fixed instead.',
    bodies: [earth, moon],
    timestep: 600,
    timeScale: 600,
    camera: { position: [0, 22, 34], target: [0, 0, 0], suggestedDistance: 40 },
    tags: ['two-body', 'moon'],
  });
}

export function circularOrbit(): Scenario {
  const primary = createBody({
    id: 'primary',
    name: 'Primary',
    type: 'star',
    mass: SOLAR_MASS,
    radius: 6.957e8,
    material: 'star',
    locked: true,
  });
  const orbiter = createOrbitalBody({
    id: 'orbiter',
    name: 'Orbiter',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ocean',
    centralMass: SOLAR_MASS,
    semimajorAxis: AU,
    eccentricity: 0,
    parentId: 'primary',
  });
  return makeScenario({
    id: 'circular-orbit',
    name: 'Stable Circular Orbit',
    description: 'A near-perfect circular orbit with velocity equal to the circular-orbit speed.',
    category: 'orbital',
    educationalNotes: 'v = √(μ/r). Velocity Verlet keeps the orbital energy nearly constant.',
    bodies: [primary, orbiter],
    timestep: 1800,
    timeScale: 3600,
    camera: { position: [0, 46, 68], target: [0, 0, 0], suggestedDistance: 80 },
    tags: ['circular', 'two-body'],
  });
}

export function ellipticalOrbit(): Scenario {
  const primary = createBody({
    id: 'primary',
    name: 'Primary',
    type: 'star',
    mass: SOLAR_MASS,
    radius: 6.957e8,
    material: 'star',
    locked: true,
  });
  const orbiter = createOrbitalBody({
    id: 'orbiter',
    name: 'Elliptical Orbiter',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'desert',
    centralMass: SOLAR_MASS,
    semimajorAxis: AU,
    eccentricity: 0.55,
    trueAnomaly: 0,
    parentId: 'primary',
  });
  return makeScenario({
    id: 'elliptical-orbit',
    name: 'Elliptical Orbit',
    description: 'A moderately eccentric orbit starting near periapsis.',
    category: 'orbital',
    educationalNotes: 'Speed is greatest at periapsis and smallest at apoapsis; angular momentum is approximately conserved.',
    bodies: [primary, orbiter],
    timestep: 1800,
    timeScale: 3600,
    camera: { position: [0, 50, 76], target: [0, 0, 0], suggestedDistance: 90 },
    tags: ['elliptical', 'kepler'],
  });
}

export function escapeVelocityScenario(): Scenario {
  const primary = createBody({
    id: 'primary',
    name: 'Primary',
    type: 'star',
    mass: SOLAR_MASS,
    radius: 6.957e8,
    material: 'star',
    locked: true,
  });
  const distance = AU;
  const speed = Math.sqrt((2 * G * SOLAR_MASS) / distance);
  const probe = createBody({
    id: 'probe',
    name: 'Probe',
    type: 'custom',
    mass: 1000,
    radius: 1e4,
    material: 'metal',
    color: '#a3e635',
    position: { x: distance, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -speed * 1.05 },
    parentId: 'primary',
  });
  return makeScenario({
    id: 'escape-velocity',
    name: 'Escape Velocity',
    description: 'A probe launched slightly above escape speed from one astronomical unit.',
    category: 'experiments',
    educationalNotes: 'v_esc = √(2μ/r). At exactly escape speed the trajectory is parabolic with zero energy at infinity.',
    bodies: [primary, probe],
    timestep: 7200,
    timeScale: 86400,
    camera: { position: [0, 60, 90], target: [0, 0, 0], suggestedDistance: 110 },
    tags: ['escape', 'energy'],
  });
}

export function binaryStarSystem(): Scenario {
  const separation = 8e10;
  const mass = SOLAR_MASS;
  const speed = 0.5 * Math.sqrt((G * mass) / separation);
  const a = createBody({
    id: 'star-a',
    name: 'Star A',
    type: 'star',
    mass,
    radius: 6.957e8,
    material: 'star',
    color: '#ffd58a',
    position: { x: -separation / 2, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -speed },
  });
  const b = createBody({
    id: 'star-b',
    name: 'Star B',
    type: 'star',
    mass,
    radius: 5.2e8,
    material: 'star',
    color: '#ff9d6c',
    position: { x: separation / 2, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: speed },
  });
  const planet = createOrbitalBody({
    id: 'circumbinary-planet',
    name: 'Circumbinary Planet',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ice',
    centralMass: 2 * mass,
    semimajorAxis: 4 * separation,
    parentId: null,
  });
  return makeScenario({
    id: 'binary-star',
    name: 'Binary Star System',
    description: 'Two equal-mass stars orbit their common barycentre with a circumbinary planet.',
    category: 'stellar',
    educationalNotes: 'Neither star is locked: both respond to mutual gravity and the centre of mass stays nearly fixed.',
    bodies: [a, b, planet],
    timestep: 3600,
    timeScale: 7200,
    camera: { position: [0, 80, 120], target: [0, 0, 0], suggestedDistance: 140 },
    tags: ['binary', 'barycentre'],
  });
}

export function threeBodySystem(): Scenario {
  const radius = 1e11;
  const bodies: CelestialBody[] = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const speed = Math.sqrt((G * SOLAR_MASS) / (Math.sqrt(3) * radius));
    bodies.push(
      createBody({
        id: `star-${i + 1}`,
        name: `Star ${i + 1}`,
        type: 'star',
        mass: SOLAR_MASS,
        radius: 6.957e8,
        material: 'star',
        color: ['#ffd58a', '#ff9d6c', '#a9c7ff'][i],
        position: {
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius,
        },
        velocity: {
          x: -Math.sin(angle) * speed,
          y: 0,
          z: Math.cos(angle) * speed,
        },
      }),
    );
  }
  return makeScenario({
    id: 'three-body',
    name: 'Three-Body System',
    description: 'An equal-mass Lagrange-style configuration that is sensitive to perturbations.',
    category: 'stellar',
    educationalNotes:
      'The equal-mass circular configuration is mathematically unstable in practice. Small integration errors grow over time.',
    bodies,
    timestep: 3600,
    timeScale: 7200,
    camera: { position: [0, 130, 180], target: [0, 0, 0], suggestedDistance: 200 },
    tags: ['three-body', 'chaos'],
  });
}

export function asteroidBeltScenario(): Scenario {
  const star = createBody({
    id: 'star',
    name: 'Central Star',
    type: 'star',
    mass: SOLAR_MASS,
    radius: 6.957e8,
    material: 'star',
    locked: true,
  });
  const asteroids: CelestialBody[] = [];
  const count = 48;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const orbitalRadius = AU * (1.8 + 0.45 * Math.sin(i * 2.7));
    const speed = Math.sqrt((G * SOLAR_MASS) / orbitalRadius);
    asteroids.push(
      createBody({
        id: `asteroid-${i}`,
        name: `Asteroid ${i + 1}`,
        type: 'asteroid',
        mass: 1e14 + i * 1e12,
        radius: 2e4 + (i % 7) * 4e3,
        material: 'rocky',
        color: '#9d8f78',
        position: { x: Math.cos(angle) * orbitalRadius, y: 0, z: Math.sin(angle) * orbitalRadius },
        velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
        parentId: 'star',
      }),
    );
  }
  return makeScenario({
    id: 'asteroid-belt',
    name: 'Asteroid Belt',
    description: 'An illustrative population of gravitationally interacting asteroids.',
    category: 'experiments',
    educationalNotes: 'Asteroid masses are exaggerated so mutual perturbations are visible on short timescales.',
    bodies: [star, ...asteroids],
    timestep: 21600,
    timeScale: 86400,
    camera: { position: [0, 180, 260], target: [0, 0, 0], suggestedDistance: 300 },
    tags: ['asteroids', 'belt'],
  });
}

export function cometOrbitScenario(): Scenario {
  const star = createBody({
    id: 'star',
    name: 'Central Star',
    type: 'star',
    mass: SOLAR_MASS,
    radius: 6.957e8,
    material: 'star',
    locked: true,
  });
  const comet = createOrbitalBody({
    id: 'comet',
    name: 'Comet',
    type: 'comet',
    mass: 1e14,
    radius: 5e3,
    material: 'comet',
    centralMass: SOLAR_MASS,
    semimajorAxis: 8 * AU,
    eccentricity: 0.86,
    inclination: 0.6,
    trueAnomaly: 0.1,
    parentId: 'star',
    notes: 'The visible tail is a simplified, anti-sunward visual effect.',
  });
  comet.visual.trail.length = 500;
  return makeScenario({
    id: 'comet-orbit',
    name: 'Comet Orbit',
    description: 'A highly eccentric, inclined comet trajectory with an illustrative tail.',
    category: 'experiments',
    educationalNotes: 'The tail model points away from the star and is not a physical plume simulation.',
    bodies: [star, comet],
    timestep: 21600,
    timeScale: 86400,
    camera: { position: [0, 220, 300], target: [0, 0, 0], suggestedDistance: 340 },
    tags: ['comet', 'eccentric'],
  });
}

export function blackHoleScenario(): Scenario {
  const singularity = createBody({
    id: 'black-hole',
    name: 'Black Hole',
    type: 'blackhole',
    mass: 4e36,
    radius: 1.2e10,
    material: 'singularity',
    color: '#07070c',
    locked: true,
    notes: 'Educational visual approximation. General relativity is not simulated.',
  });
  const disk = createOrbitalBody({
    id: 'disk-particle',
    name: 'Accretion Particle',
    type: 'asteroid',
    mass: 1e18,
    radius: 1e6,
    material: 'volcanic',
    centralMass: 4e36,
    semimajorAxis: 6e11,
    eccentricity: 0.05,
    parentId: 'black-hole',
  });
  return makeScenario({
    id: 'black-hole',
    name: 'Black Hole Visualization',
    description: 'An educational accretion-disc scene with illustrative curvature and lensing effects.',
    category: 'extreme',
    educationalNotes: 'This visualises heuristic effects only. No general-relativistic ray tracing is performed.',
    bodies: [singularity, disk],
    timestep: 3600,
    timeScale: 7200,
    camera: { position: [0, 90, 140], target: [0, 0, 0], suggestedDistance: 160 },
    tags: ['black-hole', 'extreme'],
  });
}
