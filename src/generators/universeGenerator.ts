import { createBody, createOrbitalBody, nextId } from '../data/bodyFactory';
import { MATERIAL_LIST, type MaterialDefinition } from '../data/materials';
import { AU, createRandom, G, hashString, SOLAR_MASS } from '../engine/numeric';
import type { BodyType, CelestialBody, MaterialPreset, Universe } from '../types/celestial';
import { makeScenario } from '../scenarios/builders';
import type { Scenario } from '../scenarios/types';

export type SystemVariation = 'calm' | 'balanced' | 'chaotic';

export interface GeneratorConfig {
  seed: number;
  systemName: string;
  starCount: number;
  planetCount: number;
  moonCount: number;
  asteroidCount: number;
  variation: SystemVariation;
  orbitalSpread: number;
  preferredMaterials: MaterialPreset[];
  includeComet: boolean;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  seed: 20261121,
  systemName: 'Generated System',
  starCount: 1,
  planetCount: 6,
  moonCount: 3,
  asteroidCount: 24,
  variation: 'balanced',
  orbitalSpread: 3.2,
  preferredMaterials: ['rocky', 'ocean', 'ice', 'gas-giant', 'desert', 'volcanic'],
  includeComet: true,
};

const NAME_PREFIXES = ['Astra', 'Vela', 'Nyx', 'Kep', 'Helios', 'Cygnus', 'Orion', 'Lyra', 'Tycho', 'Kepler'];
const NAME_SUFFIXES = [' Prime', ' Minor', ' Nova', ' IX', ' Reach', ' Vale', ' Station', ' Deep'];

function variationFactors(variation: SystemVariation) {
  switch (variation) {
    case 'calm':
      return { eccentricity: 0.08, inclination: 0.03, massSpread: 0.5 };
    case 'chaotic':
      return { eccentricity: 0.55, inclination: 0.55, massSpread: 2.2 };
    default:
      return { eccentricity: 0.28, inclination: 0.2, massSpread: 1.2 };
  }
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function nameFor(index: number, random: () => number): string {
  if (index === 0) return `${pick(NAME_PREFIXES, random)} Primary`;
  return `${pick(NAME_PREFIXES, random)}${pick(NAME_SUFFIXES, random)} ${index}`;
}

/** Builds a reproducible illustrative planetary system from a numeric seed. */
export function generateUniverse(config: Partial<GeneratorConfig> = {}): Universe {
  const settings = { ...DEFAULT_GENERATOR_CONFIG, ...config };
  const random = createRandom(hashString(`${settings.seed}:${settings.systemName}:${settings.variation}`));
  const factors = variationFactors(settings.variation);
  const bodies: CelestialBody[] = [];
  const materials = settings.preferredMaterials.length
    ? settings.preferredMaterials
    : MATERIAL_LIST.map((material) => material.id);
  const starCount = Math.max(1, Math.min(3, Math.floor(settings.starCount)));
  const totalStellarMass = SOLAR_MASS * (0.8 + random() * 0.8);
  const perStarMass = totalStellarMass / starCount;

  for (let i = 0; i < starCount; i += 1) {
    const color = ['#ffd58a', '#ffe6c0', '#ff9d6c'][i % 3];
    bodies.push(
      createBody({
        id: `gen-star-${i}`,
        name: i === 0 ? `${settings.systemName} Central Star` : `${settings.systemName} Companion ${i}`,
        type: 'star',
        mass: perStarMass * (0.8 + random() * 0.4),
        radius: 6.957e8 * (0.7 + random() * 0.8),
        material: 'star',
        color,
        rotationSpeed: (random() - 0.5) * 1e-5,
        locked: i === 0,
        notes: 'Procedurally generated star. Parameters are illustrative.',
      }),
    );
  }

  const primary = bodies[0];
  const planetCount = Math.max(0, Math.min(24, Math.floor(settings.planetCount)));
  const materialPool = materials
    .map((id) => MATERIAL_LIST.find((material) => material.id === id))
    .filter((material): material is MaterialDefinition => Boolean(material));
  const fallbackMaterial = MATERIAL_LIST[0];

  for (let i = 0; i < planetCount; i += 1) {
    const material = pick(materialPool.length ? materialPool : [fallbackMaterial], random);
    const orbitalRadius = AU * (0.4 + (i / Math.max(planetCount, 1)) * settings.orbitalSpread) * (0.9 + random() * 0.2);
    const isGiant = material.id === 'gas-giant';
    const mass = (isGiant ? 3e26 : 5e23) * (0.3 + random() * factors.massSpread * 2);
    const body = createOrbitalBody({
      id: `gen-planet-${i}`,
      name: nameFor(i + 1, random),
      type: 'planet',
      mass,
      radius: (isGiant ? 5e7 : 6e6) * (0.6 + random() * 0.9),
      material: material.id,
      color: material.baseColor,
      centralMass: primary.physical.mass,
      semimajorAxis: orbitalRadius,
      eccentricity: random() * factors.eccentricity,
      inclination: (random() - 0.5) * factors.inclination,
      longitudeOfAscendingNode: random() * Math.PI * 2,
      argumentOfPeriapsis: random() * Math.PI * 2,
      trueAnomaly: random() * Math.PI * 2,
      parentId: primary.id,
      rotationSpeed: (random() - 0.5) * 1e-4,
      notes: `Procedural ${material.label.toLowerCase()} world. Not based on observed data.`,
    });
    if (material.id === 'gas-giant' && random() > 0.4) {
      body.visual.rings = true;
    }
    bodies.push(body);
  }

  const planetBodies = bodies.filter((body) => body.type === 'planet');
  const moonCount = Math.max(0, Math.min(48, Math.floor(settings.moonCount)));
  for (let i = 0; i < moonCount; i += 1) {
    const parent = planetBodies[i % Math.max(planetBodies.length, 1)];
    if (!parent) break;
    const moonRadius = parent.physical.radius * (2.5 + random() * 6);
    const angle = random() * Math.PI * 2;
    const speed = Math.sqrt((G * parent.physical.mass) / moonRadius);
    bodies.push(
      createBody({
        id: `gen-moon-${i}`,
        name: `${parent.name} Moon ${Math.floor(i / Math.max(planetBodies.length, 1)) + 1}`,
        type: 'moon',
        mass: 1e21 * (0.2 + random() * 2),
        radius: 8e5 * (0.5 + random()),
        material: 'rocky',
        color: '#b9b5ae',
        parentId: parent.id,
        position: {
          x: parent.physical.position.x + Math.cos(angle) * moonRadius,
          y: parent.physical.position.y,
          z: parent.physical.position.z + Math.sin(angle) * moonRadius,
        },
        velocity: {
          x: parent.physical.velocity.x - Math.sin(angle) * speed,
          y: parent.physical.velocity.y,
          z: parent.physical.velocity.z + Math.cos(angle) * speed,
        },
      }),
    );
  }

  const asteroidCount = Math.max(0, Math.min(400, Math.floor(settings.asteroidCount)));
  for (let i = 0; i < asteroidCount; i += 1) {
    const radius = AU * (1 + random() * settings.orbitalSpread);
    const angle = random() * Math.PI * 2;
    const speed = Math.sqrt((G * primary.physical.mass) / radius);
    bodies.push(
      createBody({
        id: `gen-asteroid-${i}`,
        name: `Fragment ${i + 1}`,
        type: 'asteroid',
        mass: 1e12 * (0.2 + random() * 4),
        radius: 1e4 * (0.3 + random() * 2),
        material: 'rocky',
        color: '#968878',
        parentId: primary.id,
        position: { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius },
        velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
      }),
    );
  }

  if (settings.includeComet) {
    bodies.push(
      createOrbitalBody({
        id: 'gen-comet',
        name: `${settings.systemName} Comet`,
        type: 'comet',
        mass: 1e14,
        radius: 6e3,
        material: 'comet',
        centralMass: primary.physical.mass,
        semimajorAxis: AU * (settings.orbitalSpread + 2),
        eccentricity: 0.8,
        inclination: (random() - 0.5) * 0.8,
        parentId: primary.id,
      }),
    );
  }

  const now = Date.now();
  return {
    id: nextId('generated'),
    name: settings.systemName,
    description: `Reproducible procedural system generated from seed ${settings.seed}.`,
    bodies,
    settings: {
      G,
      softening: 1e6,
      timestep: 3600,
      integrator: 'velocity-verlet',
      collisionMode: 'merge',
      collisionsEnabled: true,
      timeScale: 3600,
    },
    createdAt: now,
    updatedAt: now,
    tags: ['generated', `seed:${settings.seed}`, settings.variation],
  };
}

export function generateScenario(config: Partial<GeneratorConfig> = {}): Scenario {
  const universe = generateUniverse(config);
  const radius = universe.bodies.find((body) => body.type === 'planet')?.physical.position ?? { x: AU, y: 0, z: 0 };
  const distance = Math.hypot(radius.x, radius.y, radius.z);
  return makeScenario({
    id: universe.id,
    name: universe.name,
    description: universe.description,
    category: 'custom',
    educationalNotes:
      'Generated parameters are illustrative and deterministic for a given seed. They are not derived from survey data.',
    bodies: universe.bodies,
    timestep: universe.settings.timestep,
    timeScale: universe.settings.timeScale,
    camera: { position: [0, distance / 3e10, distance / 2e10], target: [0, 0, 0], suggestedDistance: distance / 2e10 },
    tags: universe.tags,
  });
}

export function generatorSummary(config: GeneratorConfig): string {
  return `${config.starCount} star${config.starCount === 1 ? '' : 's'} · ${config.planetCount} planets · ${config.moonCount} moons · ${config.asteroidCount} asteroids`;
}
