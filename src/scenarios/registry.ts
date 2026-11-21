import { createSolarSystem } from '../data/solarSystem';
import { createBody } from '../data/bodyFactory';
import { AU, EARTH_MASS, G, SOLAR_MASS } from '../engine/numeric';
import {
  asteroidBeltScenario,
  binaryStarSystem,
  blackHoleScenario,
  circularOrbit,
  cometOrbitScenario,
  earthMoonSystem,
  ellipticalOrbit,
  escapeVelocityScenario,
  makeScenario,
  threeBodySystem,
} from './builders';
import type { Scenario } from './types';

export function gravitationalInteraction(): Scenario {
  const a = createBody({
    id: 'mass-a',
    name: 'Mass A',
    type: 'planet',
    mass: 5e24,
    radius: 6e6,
    material: 'ocean',
    color: '#4fa8d8',
    position: { x: -2e9, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -2500 },
  });
  const b = createBody({
    id: 'mass-b',
    name: 'Mass B',
    type: 'planet',
    mass: 1e25,
    radius: 8e6,
    material: 'desert',
    color: '#dba46c',
    position: { x: 2e9, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 2500 },
  });
  return makeScenario({
    id: 'gravitational-interaction',
    name: 'Gravitational Interaction',
    description: 'Two unbound bodies deflect one another during a close passage.',
    category: 'experiments',
    educationalNotes: 'Both bodies feel equal and opposite forces; momentum is conserved even though speeds change.',
    bodies: [a, b],
    timestep: 3600,
    timeScale: 86400,
    camera: { position: [0, 30, 46], target: [0, 0, 0], suggestedDistance: 55 },
    tags: ['gravity', 'flyby'],
  });
}

export function stabilityExperiment(): Scenario {
  const star = createBody({
    id: 'star',
    name: 'Primary Star',
    type: 'star',
    mass: SOLAR_MASS,
    radius: 6.957e8,
    material: 'star',
    locked: true,
  });
  const bodies = [star];
  for (let i = 0; i < 6; i += 1) {
    const radius = AU * (0.6 + i * 0.45);
    const angle = i * 1.9;
    const speed = Math.sqrt((G * SOLAR_MASS) / radius);
    bodies.push(
      createBody({
        id: `test-${i}`,
        name: `Test Body ${i + 1}`,
        type: i % 2 === 0 ? 'planet' : 'asteroid',
        mass: 1e20,
        radius: 5e5,
        material: i % 2 === 0 ? 'rocky' : 'metal',
        position: { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius },
        velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
        parentId: 'star',
      }),
    );
  }
  return makeScenario({
    id: 'orbital-stability',
    name: 'Orbital Stability Experiment',
    description: 'Six test bodies on circular orbits with increasing semimajor axes.',
    category: 'experiments',
    educationalNotes: 'Compare integrators: explicit Euler drifts outwards, while symplectic methods remain bounded.',
    bodies,
    timestep: 3600,
    timeScale: 86400,
    camera: { position: [0, 180, 250], target: [0, 0, 0], suggestedDistance: 290 },
    tags: ['stability', 'integrators'],
  });
}

export function customUniverse(): Scenario {
  return makeScenario({
    id: 'custom-universe',
    name: 'Custom Universe',
    description: 'An empty workspace for constructing a system from scratch.',
    category: 'custom',
    educationalNotes: 'Add a primary body first, then place orbiters using the Universe Builder.',
    bodies: [],
    timestep: 3600,
    timeScale: 3600,
    camera: { position: [0, 30, 50], target: [0, 0, 0], suggestedDistance: 60 },
    tags: ['custom', 'sandbox'],
  });
}

export function moonSystem(): Scenario {
  const planet = createBody({
    id: 'planet',
    name: 'Gas Giant',
    type: 'planet',
    mass: 1.898e27,
    radius: 6.9911e7,
    material: 'gas-giant',
    color: '#c8a37a',
    visualScale: 1.4,
    locked: true,
  });
  const moons = [0, 1, 2].map((index) => {
    const radius = (3 + index * 1.8) * 1e8;
    const angle = index * 2.1;
    const speed = Math.sqrt((G * planet.physical.mass) / radius);
    return createBody({
      id: `moon-${index}`,
      name: `Moon ${index + 1}`,
      type: 'moon',
      mass: 5e22 + index * 1e22,
      radius: 1.5e6 + index * 2e5,
      material: index === 1 ? 'ice' : 'rocky',
      parentId: 'planet',
      position: { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius },
      velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
    });
  });
  return makeScenario({
    id: 'moon-system',
    name: 'Moon System',
    description: 'Three moons orbiting a Jupiter-like primary at different distances.',
    category: 'orbital',
    educationalNotes: 'Kepler’s third law: more distant moons orbit more slowly.',
    bodies: [planet, ...moons],
    timestep: 3600,
    timeScale: 21600,
    camera: { position: [0, 110, 160], target: [0, 0, 0], suggestedDistance: 190 },
    tags: ['moons', 'satellites'],
  });
}

const scenarioFactories: Array<() => Scenario> = [
  () => {
    const solar = createSolarSystem();
    return makeScenario({
      id: 'solar-system',
      name: solar.name,
      description: solar.description,
      category: 'solar',
      educationalNotes:
        'Visual radii and distances are compressed. Orbital motion is integrated from approximate initial conditions.',
      bodies: solar.bodies,
      timestep: solar.settings.timestep,
      timeScale: solar.settings.timeScale,
      collisionMode: solar.settings.collisionMode,
      collisionsEnabled: solar.settings.collisionsEnabled,
      camera: { position: [0, 180, 280], target: [0, 0, 0], suggestedDistance: 320 },
      tags: ['solar-system', 'planets'],
    });
  },
  earthMoonSystem,
  circularOrbit,
  ellipticalOrbit,
  escapeVelocityScenario,
  binaryStarSystem,
  threeBodySystem,
  stabilityExperiment,
  asteroidBeltScenario,
  cometOrbitScenario,
  moonSystem,
  gravitationalInteraction,
  blackHoleScenario,
  customUniverse,
];

export const SCENARIOS: Scenario[] = scenarioFactories.map((factory) => factory());

export const SCENARIO_BY_ID = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));

export function getScenario(id: string): Scenario | undefined {
  return SCENARIO_BY_ID.get(id);
}

export function validateScenario(scenario: unknown): scenario is Scenario {
  if (!scenario || typeof scenario !== 'object') return false;
  const candidate = scenario as Partial<Scenario>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    !!candidate.universe &&
    Array.isArray(candidate.universe.bodies) &&
    !!candidate.camera
  );
}

export const DEFAULT_SCENARIO_ID = 'solar-system';

export function cloneScenario(scenario: Scenario): Scenario {
  return structuredClone(scenario);
}

export const BUILT_IN_SCENARIO_COUNT = SCENARIOS.length;

export function scenarioBodyMass(scenario: Scenario): number {
  return scenario.universe.bodies.reduce((sum, body) => sum + body.physical.mass, 0);
}

export function scenarioReferenceRadius(scenario: Scenario): number {
  const withMass = scenario.universe.bodies.filter((body) => body.physical.mass > 0);
  if (withMass.length === 0) return AU;
  return Math.max(...withMass.map((body) => Math.hypot(body.physical.position.x, body.physical.position.y, body.physical.position.z)), 1);
}

export function isStellarMass(mass: number): boolean {
  return mass >= 0.08 * SOLAR_MASS;
}

export function scenarioEarthBodies(scenario: Scenario): number {
  return scenario.universe.bodies.filter((body) => body.physical.mass === EARTH_MASS).length;
}
