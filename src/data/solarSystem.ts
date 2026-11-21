import { AU, DAY, G, SOLAR_MASS } from '../engine/numeric';
import { createBody, createOrbitalBody } from './bodyFactory';
import type { CelestialBody, Universe } from '../types/celestial';

/** Locally bundled, approximate astronomical values for an illustrative solar system. */
export const SOLAR_SYSTEM_DATA = {
  sun: { name: 'Sun', mass: SOLAR_MASS, radius: 6.957e8, rotation: 25.4 * DAY },
  mercury: { name: 'Mercury', mass: 3.3011e23, radius: 2.4397e6, a: 0.387 * AU, e: 0.2056, period: 87.97 * DAY },
  venus: { name: 'Venus', mass: 4.8675e24, radius: 6.0518e6, a: 0.723 * AU, e: 0.0068, period: 224.7 * DAY },
  earth: { name: 'Earth', mass: 5.9722e24, radius: 6.371e6, a: AU, e: 0.0167, period: 365.25 * DAY },
  mars: { name: 'Mars', mass: 6.4171e23, radius: 3.3895e6, a: 1.524 * AU, e: 0.0934, period: 687 * DAY },
  jupiter: { name: 'Jupiter', mass: 1.8982e27, radius: 6.9911e7, a: 5.204 * AU, e: 0.0489, period: 4333 * DAY },
  saturn: { name: 'Saturn', mass: 5.6834e26, radius: 5.8232e7, a: 9.583 * AU, e: 0.0565, period: 10759 * DAY },
  uranus: { name: 'Uranus', mass: 8.681e25, radius: 2.5362e7, a: 19.191 * AU, e: 0.0457, period: 30687 * DAY },
  neptune: { name: 'Neptune', mass: 1.02413e26, radius: 2.4622e7, a: 30.07 * AU, e: 0.0113, period: 60190 * DAY },
  moon: { name: 'Moon', mass: 7.346e22, radius: 1.7374e6, a: 3.844e8, e: 0.0549, period: 27.32 * DAY },
  pluto: { name: 'Pluto', mass: 1.303e22, radius: 1.1883e6, a: 39.48 * AU, e: 0.2488, period: 90560 * DAY },
} as const;

/** Creates the Sun and major planets as independent gravitationally interacting bodies. */
export function createSolarSystemBodies(): CelestialBody[] {
  const sun = createBody({
    id: 'sun',
    name: SOLAR_SYSTEM_DATA.sun.name,
    type: 'star',
    mass: SOLAR_SYSTEM_DATA.sun.mass,
    radius: SOLAR_SYSTEM_DATA.sun.radius,
    color: '#ffd27a',
    material: 'star',
    rotationSpeed: (2 * Math.PI) / SOLAR_SYSTEM_DATA.sun.rotation,
    locked: true,
    notes: 'G-type main-sequence star. Visual size is enhanced for exploration.',
  });

  const planets: CelestialBody[] = [
    ['mercury', '#9d8f83', 'rocky', 0.035],
    ['venus', '#d9b16b', 'clouded', -0.06],
    ['earth', '#3d86c4', 'ocean', 0.41],
    ['mars', '#b95c3c', 'desert', 0.44],
    ['jupiter', '#c8a37a', 'gas-giant', 0.14],
    ['saturn', '#dcc294', 'gas-giant', 0.13],
    ['uranus', '#9ed9e0', 'ice', -0.12],
    ['neptune', '#4a6fd4', 'ice', 0.1],
    ['pluto', '#b9a99c', 'rocky', 0.02],
  ].map(([key, color, material, inclination], index) => {
    const data = SOLAR_SYSTEM_DATA[key as keyof typeof SOLAR_SYSTEM_DATA] as {
      name: string;
      mass: number;
      radius: number;
      a: number;
      e: number;
    };
    const body = createOrbitalBody({
      id: key as string,
      name: data.name,
      type: key === 'pluto' ? 'dwarf' : 'planet',
      mass: data.mass,
      radius: data.radius,
      color: color as string,
      material: material as 'rocky',
      centralMass: SOLAR_MASS,
      gravitationalConstant: G,
      semimajorAxis: data.a,
      eccentricity: data.e,
      inclination: (inclination as number) * 0.06,
      trueAnomaly: key === 'earth' ? 0 : index * 2.399963,
      parentId: 'sun',
      rotationSpeed: 2 * Math.PI / DAY / 2,
      notes:
        key === 'earth'
          ? 'Illustrative Earth analogue. Procedural surface; not a photographic map.'
          : 'Approximate orbital elements and physical properties.',
    });
    if (key === 'saturn') {
      body.visual.rings = true;
      body.visual.ringColor = '#cbb08a';
    }
    return body;
  });

  const moon = createBody({
    id: 'moon',
    name: SOLAR_SYSTEM_DATA.moon.name,
    type: 'moon',
    mass: SOLAR_SYSTEM_DATA.moon.mass,
    radius: SOLAR_SYSTEM_DATA.moon.radius,
    color: '#c7c7c2',
    material: 'rocky',
    parentId: 'earth',
  });
  const earth = planets.find((planet) => planet.id === 'earth')!;
  moon.physical.position = {
    x: earth.physical.position.x + SOLAR_SYSTEM_DATA.moon.a,
    y: earth.physical.position.y,
    z: earth.physical.position.z,
  };
  moon.physical.velocity = {
    x: earth.physical.velocity.x,
    y: earth.physical.velocity.y,
    z: earth.physical.velocity.z + Math.sqrt((G * earth.physical.mass) / SOLAR_SYSTEM_DATA.moon.a),
  };

  return [sun, ...planets, moon];
}

export function createSolarSystem(): Universe {
  return {
    id: 'solar-system',
    name: 'Solar System Explorer',
    description: 'An illustrative, gravitationally simulated solar system with approximate initial conditions.',
    bodies: createSolarSystemBodies(),
    settings: {
      G,
      softening: 1e6,
      timestep: 3600,
      integrator: 'velocity-verlet',
      collisionMode: 'merge',
      collisionsEnabled: true,
      timeScale: 3600,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['solar-system', 'planets'],
  };
}
