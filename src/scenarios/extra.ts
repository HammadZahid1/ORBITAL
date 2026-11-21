import { createBody, createOrbitalBody } from '../data/bodyFactory';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { AU, DAY, EARTH_MASS, EARTH_RADIUS, G, SOLAR_MASS } from '../engine/numeric';
import { escapeVelocity, orbitalPeriod } from '../engine/orbits/orbital';
import type { BodyType, CelestialBody, MaterialPreset } from '../types/celestial';
import { makeScenario, type ScenarioBaseOptions } from './builders';
import type { Scenario } from './types';

const TWO_PI = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SIDEREAL_DAY = 86164;

interface BinarySpec {
  id: string;
  name: string;
  type: BodyType;
  mass: number;
  radius: number;
  material: MaterialPreset;
  color: string;
  notes?: string;
}

interface BinaryPairOptions {
  /** Fraction of the circular orbital speed, for mildly eccentric teaching models. */
  speedFactor?: number;
  /** Fraction of the orbital speed directed radially inward. */
  radialFactor?: number;
}

/** makeScenario stamps wall-clock time; pin it so fresh builds are deeply equal. */
function fixedScenario(options: ScenarioBaseOptions): Scenario {
  const scenario = makeScenario(options);
  scenario.universe.createdAt = 0;
  scenario.universe.updatedAt = 0;
  return scenario;
}

function wrapAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

function sunBody(id: string): CelestialBody {
  return createBody({
    id,
    name: 'Sun',
    type: 'star',
    mass: SOLAR_SYSTEM_DATA.sun.mass,
    radius: SOLAR_SYSTEM_DATA.sun.radius,
    material: 'star',
    color: '#ffd27a',
    rotationSpeed: TWO_PI / SOLAR_SYSTEM_DATA.sun.rotation,
    locked: true,
    notes: 'Anchored G-type primary. Visual radius is illustrative, not to scale.',
  });
}

/** Creates an exact two-body barycentric pair in the X–Z plane. */
function barycentricPair(
  primary: BinarySpec,
  secondary: BinarySpec,
  separation: number,
  options: BinaryPairOptions = {},
): [CelestialBody, CelestialBody] {
  const totalMass = primary.mass + secondary.mass;
  const primaryDistance = (separation * secondary.mass) / totalMass;
  const secondaryDistance = (separation * primary.mass) / totalMass;
  const relativeSpeed = Math.sqrt((G * totalMass) / separation);
  const primarySpeed = (relativeSpeed * secondary.mass) / totalMass;
  const secondarySpeed = (relativeSpeed * primary.mass) / totalMass;
  const speedFactor = options.speedFactor ?? 1;
  const radialFactor = options.radialFactor ?? 0;

  // Primary sits at -X, secondary at +X; prograde motion puts them on ∓Z.
  const first = createBody({
    ...primary,
    position: { x: -primaryDistance, y: 0, z: 0 },
    velocity: {
      x: primarySpeed * radialFactor,
      y: 0,
      z: -primarySpeed * speedFactor,
    },
  });
  const second = createBody({
    ...secondary,
    position: { x: secondaryDistance, y: 0, z: 0 },
    velocity: {
      x: -secondarySpeed * radialFactor,
      y: 0,
      z: secondarySpeed * speedFactor,
    },
  });
  return [first, second];
}

function earthVenusTransfer(): Scenario {
  const rEarth = SOLAR_SYSTEM_DATA.earth.a;
  const rVenus = SOLAR_SYSTEM_DATA.venus.a;
  const transferAxis = (rEarth + rVenus) / 2;
  const transferEccentricity = (rEarth - rVenus) / (rEarth + rVenus);
  const muSun = G * SOLAR_MASS;
  const transferTime = orbitalPeriod(transferAxis, muSun) / 2;
  const venusMeanMotion = TWO_PI / orbitalPeriod(rVenus, muSun);
  const venusPhase = wrapAngle(TWO_PI - venusMeanMotion * transferTime);

  const earth = createOrbitalBody({
    id: 'ev-earth',
    name: 'Earth',
    type: 'planet',
    mass: SOLAR_SYSTEM_DATA.earth.mass,
    radius: SOLAR_SYSTEM_DATA.earth.radius,
    material: 'ocean',
    color: '#3d86c4',
    centralMass: SOLAR_MASS,
    semimajorAxis: rEarth,
    eccentricity: 0,
    trueAnomaly: Math.PI,
    parentId: 'ev-sun',
    notes: 'Departure planet, placed at the transfer orbit’s aphelion.',
  });
  const venus = createOrbitalBody({
    id: 'ev-venus',
    name: 'Venus',
    type: 'planet',
    mass: SOLAR_SYSTEM_DATA.venus.mass,
    radius: SOLAR_SYSTEM_DATA.venus.radius,
    material: 'clouded',
    color: '#d9b16b',
    centralMass: SOLAR_MASS,
    semimajorAxis: rVenus,
    eccentricity: 0,
    trueAnomaly: venusPhase,
    parentId: 'ev-sun',
    notes: 'Phased so that it reaches the transfer perihelion near probe arrival.',
  });
  const probe = createOrbitalBody({
    id: 'ev-probe',
    name: 'Transfer Probe',
    type: 'custom',
    mass: 3200,
    radius: 1e4,
    material: 'metal',
    color: '#a3e635',
    centralMass: SOLAR_MASS,
    semimajorAxis: transferAxis,
    eccentricity: transferEccentricity,
    trueAnomaly: Math.PI,
    parentId: 'ev-sun',
    notes: 'Ideal Hohmann ellipse from Earth’s orbit down to Venus’s orbit.',
  });

  return fixedScenario({
    id: 'earth-venus-transfer',
    name: 'Earth–Venus Transfer',
    description: 'A coplanar Hohmann-transfer sketch with Earth, Venus and a probe on the transfer ellipse.',
    category: 'orbital',
    educationalNotes:
      'The transfer ellipse touches both circular orbits. Its half-period sets the Venus launch phase; the probe leaves Earth with less heliocentric speed because it is falling inward.',
    bodies: [sunBody('ev-sun'), earth, venus, probe],
    timestep: 3600,
    timeScale: 21600,
    camera: { position: [0, 42, 66], target: [0, 0, 0], suggestedDistance: 80 },
    tags: ['transfer', 'hohmann', 'venus'],
  });
}

function plutoCharonBinary(): Scenario {
  const [pluto, charon] = barycentricPair(
    {
      id: 'pc-pluto',
      name: 'Pluto',
      type: 'dwarf',
      mass: SOLAR_SYSTEM_DATA.pluto.mass,
      radius: SOLAR_SYSTEM_DATA.pluto.radius,
      material: 'rocky',
      color: '#b9a99c',
      notes: 'The barycentre of this pair lies outside Pluto’s surface.',
    },
    {
      id: 'pc-charon',
      name: 'Charon',
      type: 'moon',
      mass: 1.52e21,
      radius: 606e3,
      material: 'ice',
      color: '#b9c8d0',
    },
    1.964e7,
  );

  return fixedScenario({
    id: 'pluto-charon-binary',
    name: 'Pluto–Charon Binary',
    description: 'Pluto and Charon orbiting their common barycentre rather than one body anchoring the other.',
    category: 'orbital',
    educationalNotes:
      'Charon carries about a tenth of Pluto’s mass, so the barycentre sits between them. Both bodies must move for the centre of mass to remain fixed.',
    bodies: [pluto, charon],
    timestep: 600,
    timeScale: 3600,
    camera: { position: [0, 7, 11], target: [0, 0, 0], suggestedDistance: 14 },
    tags: ['binary', 'pluto', 'barycentre'],
  });
}

function jupiterSaturnResonance(): Scenario {
  const jupiterAxis = SOLAR_SYSTEM_DATA.jupiter.a;
  // Kepler's third law places Saturn at a 5:2 period ratio with Jupiter.
  const saturnAxis = jupiterAxis * Math.pow(5 / 2, 2 / 3);

  const jupiter = createOrbitalBody({
    id: 'res-jupiter',
    name: 'Jupiter',
    type: 'planet',
    mass: SOLAR_SYSTEM_DATA.jupiter.mass,
    radius: SOLAR_SYSTEM_DATA.jupiter.radius,
    material: 'gas-giant',
    color: '#c8a37a',
    centralMass: SOLAR_MASS,
    semimajorAxis: jupiterAxis,
    eccentricity: 0.02,
    trueAnomaly: 0,
    parentId: 'res-sun',
  });
  const saturn = createOrbitalBody({
    id: 'res-saturn',
    name: 'Saturn',
    type: 'planet',
    mass: SOLAR_SYSTEM_DATA.saturn.mass,
    radius: SOLAR_SYSTEM_DATA.saturn.radius,
    material: 'gas-giant',
    color: '#dcc294',
    centralMass: SOLAR_MASS,
    semimajorAxis: saturnAxis,
    eccentricity: 0.03,
    trueAnomaly: 0,
    parentId: 'res-sun',
    notes: 'Axis nudged to 5:2 commensurability; the real ratio is close but not exact.',
  });
  saturn.visual.rings = true;

  return fixedScenario({
    id: 'sun-jupiter-saturn-resonance',
    name: 'Sun–Jupiter–Saturn Resonance Sketch',
    description: 'Near-circular giant-planet orbits tuned to a 5:2 mean-motion resonance for conjunction studies.',
    category: 'solar',
    educationalNotes:
      'Jupiter completes five circuits while Saturn completes two. Repeated alignments pump small eccentricities; the masses here are real but the orbital phases are idealised.',
    bodies: [sunBody('res-sun'), jupiter, saturn],
    timestep: 43200,
    timeScale: 864000,
    camera: { position: [0, 190, 280], target: [0, 0, 0], suggestedDistance: 320 },
    tags: ['resonance', 'jupiter', 'saturn'],
  });
}

function unequalBinaryProbe(): Scenario {
  const separation = 1e11;
  const primaryMass = 1.2 * SOLAR_MASS;
  const secondaryMass = 0.8 * SOLAR_MASS;
  const [primary, secondary] = barycentricPair(
    {
      id: 'ubp-primary',
      name: 'Primary Star',
      type: 'star',
      mass: primaryMass,
      radius: 8.1e8,
      material: 'star',
      color: '#ffd58a',
    },
    {
      id: 'ubp-secondary',
      name: 'Secondary Star',
      type: 'star',
      mass: secondaryMass,
      radius: 5.9e8,
      material: 'star',
      color: '#ff9d6c',
    },
    separation,
  );
  const probe = createOrbitalBody({
    id: 'ubp-probe',
    name: 'Circumbinary Probe',
    type: 'custom',
    mass: 1500,
    radius: 1e4,
    material: 'metal',
    color: '#a3e635',
    centralMass: primaryMass + secondaryMass,
    semimajorAxis: 5.5 * separation,
    eccentricity: 0.015,
    trueAnomaly: 0.35,
    parentId: null,
    notes: 'Orbiting the system barycentre well outside the inner binary’s stability limit.',
  });

  return fixedScenario({
    id: 'unequal-binary-probe',
    name: 'Unequal Binary with Circumbinary Probe',
    description: 'A 3:2-mass stellar binary with a lightweight probe orbiting both stars from a safe distance.',
    category: 'stellar',
    educationalNotes:
      'The stars orbit their own barycentre, which is closer to the heavier star. The probe feels the combined mass only when it is far from the pair.',
    bodies: [primary, secondary, probe],
    timestep: 3600,
    timeScale: 14400,
    camera: { position: [0, 150, 230], target: [0, 0, 0], suggestedDistance: 270 },
    tags: ['binary', 'circumbinary', 'probe'],
  });
}

function marsCaptureAttempt(): Scenario {
  const mars = createOrbitalBody({
    id: 'mc-mars',
    name: 'Mars',
    type: 'planet',
    mass: SOLAR_SYSTEM_DATA.mars.mass,
    radius: SOLAR_SYSTEM_DATA.mars.radius,
    material: 'desert',
    color: '#b95c3c',
    centralMass: SOLAR_MASS,
    semimajorAxis: SOLAR_SYSTEM_DATA.mars.a,
    eccentricity: 0,
    trueAnomaly: 0,
    parentId: 'mc-sun',
  });
  const approachDistance = 1.8e8;
  const relativeSpeed = escapeVelocity(G * mars.physical.mass, approachDistance) * 1.12;
  const probe = createBody({
    id: 'mc-probe',
    name: 'Capture Attempt Probe',
    type: 'custom',
    mass: 1900,
    radius: 5e3,
    material: 'metal',
    color: '#a3e635',
    parentId: 'mc-mars',
    position: {
      x: mars.physical.position.x + approachDistance,
      y: mars.physical.position.y,
      z: mars.physical.position.z,
    },
    velocity: {
      x: mars.physical.velocity.x - 0.86 * relativeSpeed,
      y: mars.physical.velocity.y,
      z: mars.physical.velocity.z - 0.51 * relativeSpeed,
    },
    notes: 'Hyperbolic approach: without aerobraking or a burn, Mars cannot capture it.',
  });

  return fixedScenario({
    id: 'mars-capture-attempt',
    name: 'Mars Capture Attempt',
    description: 'An arriving probe approaches Mars above escape speed to demonstrate why orbit insertion needs a burn.',
    category: 'experiments',
    educationalNotes:
      'The probe starts at 1.12 times the local escape speed relative to Mars. Gravity bends its path but cannot remove the positive orbital energy.',
    bodies: [sunBody('mc-sun'), mars, probe],
    timestep: 300,
    timeScale: 3600,
    camera: { position: [0, 80, 120], target: [mars.physical.position.x, 0, 0], suggestedDistance: 140 },
    tags: ['mission', 'mars', 'capture'],
  });
}

function lunarFreeReturn(): Scenario {
  const parkingRadius = EARTH_RADIUS + 3e5;
  const targetApogee = SOLAR_SYSTEM_DATA.moon.a * 1.12;
  const muEarth = G * EARTH_MASS;
  const injectionAxis = (parkingRadius + targetApogee) / 2;
  const injectionSpeed = Math.sqrt(muEarth * (2 / parkingRadius - 1 / injectionAxis));
  const outboundTime = orbitalPeriod(injectionAxis, muEarth) / 2;
  const moonMeanMotion = TWO_PI / orbitalPeriod(SOLAR_SYSTEM_DATA.moon.a, muEarth);
  const moonPhase = wrapAngle(TWO_PI - moonMeanMotion * outboundTime);

  const earth = createBody({
    id: 'fr-earth',
    name: 'Earth',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ocean',
    color: '#3d86c4',
    rotationSpeed: TWO_PI / DAY,
    locked: true,
    notes: 'Anchored primary for the patched-conic demonstration.',
  });
  const moon = createOrbitalBody({
    id: 'fr-moon',
    name: 'Moon',
    type: 'moon',
    mass: SOLAR_SYSTEM_DATA.moon.mass,
    radius: SOLAR_SYSTEM_DATA.moon.radius,
    material: 'rocky',
    color: '#c8c8c4',
    centralMass: EARTH_MASS,
    semimajorAxis: SOLAR_SYSTEM_DATA.moon.a,
    eccentricity: 0,
    trueAnomaly: moonPhase,
    parentId: 'fr-earth',
    notes: 'Phased to be near the spacecraft’s apogee after the outbound coast.',
  });
  const capsule = createBody({
    id: 'fr-capsule',
    name: 'Return Capsule',
    type: 'custom',
    mass: 5500,
    radius: 8e3,
    material: 'metal',
    color: '#facc15',
    parentId: 'fr-earth',
    position: { x: parkingRadius, y: 0, z: 0 },
    velocity: { x: injectionSpeed, y: 0, z: 0 },
    notes: 'Translunar injection onto an ellipse whose apogee passes just beyond the Moon.',
  });

  return fixedScenario({
    id: 'lunar-free-return-sketch',
    name: 'Lunar Free-Return Sketch',
    description: 'A translunar injection ellipse and a phased Moon set up an illustrative lunar flyby and return.',
    category: 'orbital',
    educationalNotes:
      'This is a patched-conic sketch, not a flown trajectory: the lunar flyby is not solved here. Watch how the apogee speed is tiny compared with the injection speed.',
    bodies: [earth, moon, capsule],
    timestep: 600,
    timeScale: 21600,
    camera: { position: [0, 30, 48], target: [0, 0, 0], suggestedDistance: 58 },
    tags: ['mission', 'moon', 'free-return'],
  });
}

function trojanAsteroidPair(): Scenario {
  const jupiterAxis = SOLAR_SYSTEM_DATA.jupiter.a;
  const jupiter = createOrbitalBody({
    id: 'tr-jupiter',
    name: 'Jupiter',
    type: 'planet',
    mass: SOLAR_SYSTEM_DATA.jupiter.mass,
    radius: SOLAR_SYSTEM_DATA.jupiter.radius,
    material: 'gas-giant',
    color: '#c8a37a',
    centralMass: SOLAR_MASS,
    semimajorAxis: jupiterAxis,
    eccentricity: 0,
    trueAnomaly: 0,
    parentId: 'tr-sun',
  });
  const l4 = createOrbitalBody({
    id: 'tr-l4',
    name: 'L4 Trojan',
    type: 'asteroid',
    mass: 6e17,
    radius: 7e4,
    material: 'rocky',
    color: '#9d8f78',
    centralMass: SOLAR_MASS,
    semimajorAxis: jupiterAxis,
    eccentricity: 0,
    trueAnomaly: Math.PI / 3,
    parentId: 'tr-sun',
    notes: 'Leads Jupiter by roughly 60 degrees.',
  });
  const l5 = createOrbitalBody({
    id: 'tr-l5',
    name: 'L5 Trojan',
    type: 'asteroid',
    mass: 4e17,
    radius: 5e4,
    material: 'rocky',
    color: '#9d8f78',
    centralMass: SOLAR_MASS,
    semimajorAxis: jupiterAxis,
    eccentricity: 0,
    trueAnomaly: -Math.PI / 3,
    parentId: 'tr-sun',
    notes: 'Trails Jupiter by roughly 60 degrees.',
  });

  return fixedScenario({
    id: 'trojan-asteroid-pair',
    name: 'Jupiter Trojan Pair',
    description: 'Two small bodies at Jupiter’s L4 and L5 points sharing the planet’s orbit around the Sun.',
    category: 'solar',
    educationalNotes:
      'The triangular Lagrange points are stable for small masses when the primary is much heavier than the secondary. Both trojans lead or trail Jupiter by about 60 degrees.',
    bodies: [sunBody('tr-sun'), jupiter, l4, l5],
    timestep: 21600,
    timeScale: 864000,
    camera: { position: [0, 110, 160], target: [0, 0, 0], suggestedDistance: 185 },
    tags: ['trojans', 'lagrange', 'jupiter'],
  });
}

function cometBreakup(): Scenario {
  const orbit = {
    centralMass: SOLAR_MASS,
    semimajorAxis: 6 * AU,
    eccentricity: 0.78,
    inclination: 0.35,
    longitudeOfAscendingNode: 0.4,
    argumentOfPeriapsis: 0.8,
    trueAnomaly: 0.25,
    parentId: 'cb-sun',
  } as const;
  const fragmentA = createOrbitalBody({
    ...orbit,
    id: 'cb-fragment-a',
    name: 'Fragment A',
    type: 'comet',
    mass: 8e12,
    radius: 1800,
    material: 'comet',
    color: '#b7e4e7',
    notes: 'The larger fragment follows the unperturbed parent orbit.',
  });
  const fragmentB = createOrbitalBody({
    ...orbit,
    id: 'cb-fragment-b',
    name: 'Fragment B',
    type: 'comet',
    mass: 3.5e12,
    radius: 1100,
    material: 'comet',
    color: '#9fd3d6',
  });
  // A small separation and differential kick stand in for a gentle splitting event.
  fragmentB.physical.position.x += 1.2e5;
  fragmentB.physical.velocity.y += 6;
  fragmentB.physical.velocity.z -= 18;
  fragmentA.visual.trail.length = 500;
  fragmentB.visual.trail.length = 500;

  return fixedScenario({
    id: 'comet-breakup-analogue',
    name: 'Comet Breakup Analogue',
    description: 'Two comet fragments on nearly identical eccentric orbits with a small differential velocity.',
    category: 'experiments',
    educationalNotes:
      'Tiny velocity differences at breakup grow into a long train of fragments along the orbit. No outgassing or non-gravitational forces are modelled.',
    bodies: [sunBody('cb-sun'), fragmentA, fragmentB],
    timestep: 21600,
    timeScale: 86400,
    camera: { position: [0, 180, 260], target: [0, 0, 0], suggestedDistance: 300 },
    tags: ['comet', 'fragments', 'dispersion'],
  });
}

function compactBinaryInspiral(): Scenario {
  const mass = 1.4 * SOLAR_MASS;
  const [starA, starB] = barycentricPair(
    {
      id: 'ci-star-a',
      name: 'Neutron Star A',
      type: 'star',
      mass,
      radius: 1.2e4,
      material: 'star',
      color: '#b8c8ff',
      notes: 'Newtonian compact-binary analogue; gravitational-wave damping is not simulated.',
    },
    {
      id: 'ci-star-b',
      name: 'Neutron Star B',
      type: 'star',
      mass,
      radius: 1.1e4,
      material: 'star',
      color: '#ffd0f0',
    },
    2e6,
    { speedFactor: 0.985, radialFactor: 0.06 },
  );

  return fixedScenario({
    id: 'compact-binary-inspiral-analogue',
    name: 'Compact Binary Inspiral Analogue',
    description: 'Two neutron stars in a tight, slightly eccentric orbit at a small fraction of light speed.',
    category: 'extreme',
    educationalNotes:
      'The inward radial component makes an eccentric Newtonian orbit. Real neutron-star binaries shrink through gravitational-wave emission, which this solver does not model.',
    bodies: [starA, starB],
    timestep: 0.5,
    timeScale: 60,
    camera: { position: [0, 3, 5], target: [0, 0, 0], suggestedDistance: 7 },
    tags: ['compact-binary', 'neutron-star', 'gravitational-waves'],
  });
}

function kuiperBeltSample(): Scenario {
  const objects: CelestialBody[] = [];
  for (let i = 0; i < 24; i += 1) {
    const axis = AU * (42 + (i % 8) * 0.75 + 0.2 * Math.sin(i * 1.7));
    objects.push(
      createOrbitalBody({
        id: `kb-object-${i}`,
        name: `Kuiper Object ${i + 1}`,
        type: 'dwarf',
        mass: 1e19 + i * 6e17,
        radius: 6e4 + (i % 6) * 1.5e4,
        material: 'ice',
        color: '#a9c7d8',
        centralMass: SOLAR_MASS,
        semimajorAxis: axis,
        eccentricity: 0.02 + 0.012 * (i % 5),
        inclination: 0.06 * Math.sin(i * 0.8),
        longitudeOfAscendingNode: 0.3 * i,
        trueAnomaly: GOLDEN_ANGLE * i,
        parentId: 'kb-sun',
        notes: 'Illustrative trans-Neptunian object with approximate icy composition.',
      }),
    );
  }

  return fixedScenario({
    id: 'kuiper-belt-sample',
    name: 'Kuiper Belt Sample',
    description: 'A sparse sample of icy bodies beyond Neptune with small eccentricities and inclinations.',
    category: 'solar',
    educationalNotes:
      'Objects near 42–48 AU complete an orbit in roughly 300 years. Their low inclinations and modest eccentricities make a dynamically cold belt sketch.',
    bodies: [sunBody('kb-sun'), ...objects],
    timestep: 86400,
    timeScale: 8640000,
    camera: { position: [0, 300, 440], target: [0, 0, 0], suggestedDistance: 500 },
    tags: ['kuiper-belt', 'ice', 'outer-solar-system'],
  });
}

function threeStarHierarchy(): Scenario {
  const massA = 1.1 * SOLAR_MASS;
  const massB = 0.9 * SOLAR_MASS;
  const massC = 1.5 * SOLAR_MASS;
  const innerMass = massA + massB;
  const totalMass = innerMass + massC;
  const innerSeparation = 2e10;
  const outerSeparation = 8e11;

  const innerBarycenterDistance = (outerSeparation * massC) / totalMass;
  const outerStarDistance = (outerSeparation * innerMass) / totalMass;
  const outerRelativeSpeed = Math.sqrt((G * totalMass) / outerSeparation);
  const innerBarycenterSpeed = (outerRelativeSpeed * massC) / totalMass;
  const outerStarSpeed = (outerRelativeSpeed * innerMass) / totalMass;

  const [starA, starB] = barycentricPair(
    {
      id: 'hier-star-a',
      name: 'Inner Star A',
      type: 'star',
      mass: massA,
      radius: 7.4e8,
      material: 'star',
      color: '#ffd58a',
    },
    {
      id: 'hier-star-b',
      name: 'Inner Star B',
      type: 'star',
      mass: massB,
      radius: 6.1e8,
      material: 'star',
      color: '#ff9d6c',
    },
    innerSeparation,
  );
  for (const body of [starA, starB]) {
    body.physical.position.x -= innerBarycenterDistance;
    body.physical.velocity.z -= innerBarycenterSpeed;
  }
  const starC = createBody({
    id: 'hier-star-c',
    name: 'Outer Star C',
    type: 'star',
    mass: massC,
    radius: 9.2e8,
    material: 'star',
    color: '#a9c7ff',
    position: { x: outerStarDistance, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: outerStarSpeed },
    notes: 'Outer member of a stable hierarchical triple.',
  });

  return fixedScenario({
    id: 'three-star-hierarchy',
    name: 'Three-Star Hierarchy',
    description: 'A close stellar binary orbiting a more distant third star in a stable nested configuration.',
    category: 'stellar',
    educationalNotes:
      'The inner pair orbits its own barycentre while that barycentre orbits the outer star. A wide separation ratio keeps the triple hierarchical rather than chaotic.',
    bodies: [starA, starB, starC],
    timestep: 1800,
    timeScale: 14400,
    camera: { position: [0, 150, 220], target: [0, 0, 0], suggestedDistance: 260 },
    tags: ['triple', 'hierarchy', 'stellar'],
  });
}

function retrogradeComparison(): Scenario {
  const axis = 2 * AU;
  const orbit = {
    centralMass: SOLAR_MASS,
    semimajorAxis: axis,
    eccentricity: 0.08,
  } as const;
  const prograde = createOrbitalBody({
    ...orbit,
    id: 'ret-prograde',
    name: 'Prograde Planet',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ocean',
    color: '#3d86c4',
    trueAnomaly: 0.4,
    direction: 1,
    parentId: 'ret-sun',
    notes: 'Angular momentum points along +Y.',
  });
  const retrograde = createOrbitalBody({
    ...orbit,
    id: 'ret-retrograde',
    name: 'Retrograde Planet',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'desert',
    color: '#b95c3c',
    trueAnomaly: Math.PI + 0.4,
    direction: -1,
    parentId: 'ret-sun',
    notes: 'Same orbit mirrored: angular momentum points along -Y.',
  });
  const polar = createOrbitalBody({
    ...orbit,
    id: 'ret-polar',
    name: 'Polar Reference',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ice',
    color: '#9ed9e0',
    inclination: Math.PI / 2,
    trueAnomaly: 1.7,
    direction: 1,
    parentId: 'ret-sun',
    notes: 'A 90-degree inclination makes the direction reversal easy to see.',
  });

  return fixedScenario({
    id: 'retrograde-orbit-comparison',
    name: 'Retrograde Orbit Comparison',
    description: 'Three equal planets on the same ellipse: prograde, retrograde and polar.',
    category: 'experiments',
    educationalNotes:
      'Reversing velocity flips the angular-momentum vector without changing the ellipse. Inclination is an independent orbital element.',
    bodies: [sunBody('ret-sun'), prograde, retrograde, polar],
    timestep: 7200,
    timeScale: 86400,
    camera: { position: [0, 70, 105], target: [0, 0, 0], suggestedDistance: 125 },
    tags: ['retrograde', 'inclination', 'comparison'],
  });
}

function highEccentricityComets(): Scenario {
  const axis = 3 * AU;
  const eccentricity = 0.94;
  const perihelionComet = createOrbitalBody({
    id: 'he-perihelion',
    name: 'Comet at Perihelion',
    type: 'comet',
    mass: 6e13,
    radius: 3e3,
    material: 'comet',
    color: '#b7e4e7',
    centralMass: SOLAR_MASS,
    semimajorAxis: axis,
    eccentricity,
    inclination: 0.18,
    trueAnomaly: 0,
    parentId: 'he-sun',
    notes: 'Near 0.18 AU: strong solar heating and maximum speed.',
  });
  const aphelionComet = createOrbitalBody({
    id: 'he-aphelion',
    name: 'Comet at Aphelion',
    type: 'comet',
    mass: 6e13,
    radius: 3e3,
    material: 'comet',
    color: '#9fd3d6',
    centralMass: SOLAR_MASS,
    semimajorAxis: axis,
    eccentricity,
    inclination: 0.18,
    trueAnomaly: Math.PI,
    parentId: 'he-sun',
    notes: 'The same ellipse sampled near 5.8 AU: cold and slow.',
  });
  perihelionComet.visual.trail.length = 700;
  aphelionComet.visual.trail.length = 700;

  return fixedScenario({
    id: 'high-eccentricity-comet-comparison',
    name: 'High-Eccentricity Comet Comparison',
    description: 'Two comets on one extreme ellipse, sampled at perihelion and aphelion for a speed comparison.',
    category: 'experiments',
    educationalNotes:
      'With e = 0.94 the speed ratio between perihelion and aphelion is (1 + e)/(1 − e) ≈ 32. The orbit stays bound and outside the Sun’s radius.',
    bodies: [sunBody('he-sun'), perihelionComet, aphelionComet],
    timestep: 21600,
    timeScale: 86400,
    camera: { position: [0, 260, 380], target: [0, 0, 0], suggestedDistance: 430 },
    tags: ['comet', 'kepler', 'eccentricity'],
  });
}

function geostationaryRing(): Scenario {
  const earth = createBody({
    id: 'geo-earth',
    name: 'Earth',
    type: 'planet',
    mass: EARTH_MASS,
    radius: EARTH_RADIUS,
    material: 'ocean',
    color: '#3d86c4',
    rotationSpeed: TWO_PI / SIDEREAL_DAY,
    locked: true,
    notes: 'Anchored Earth rotating once per sidereal day.',
  });
  const geoRadius = 4.2164e7;
  const satellites = [0, 1, 2].map((index) =>
    createOrbitalBody({
      id: `geo-sat-${index}`,
      name: `Geostationary Satellite ${index + 1}`,
      type: 'custom',
      mass: 4200 + index * 250,
      radius: 4e3,
      material: 'metal',
      color: '#a3e635',
      centralMass: EARTH_MASS,
      semimajorAxis: geoRadius,
      eccentricity: 0,
      inclination: 0,
      trueAnomaly: (index * TWO_PI) / 3,
      parentId: 'geo-earth',
      notes: 'Orbital period matches Earth’s sidereal rotation.',
    }),
  );
  const drifter = createOrbitalBody({
    id: 'geo-drifter',
    name: 'Supersynchronous Drifter',
    type: 'custom',
    mass: 4600,
    radius: 4e3,
    material: 'metal',
    color: '#facc15',
    centralMass: EARTH_MASS,
    semimajorAxis: geoRadius + 2.5e5,
    eccentricity: 0.001,
    trueAnomaly: 3.6,
    parentId: 'geo-earth',
    notes: 'Slightly above geostationary altitude, so it slowly drifts in longitude.',
  });

  return fixedScenario({
    id: 'geostationary-ring',
    name: 'Geostationary Ring',
    description: 'Three geostationary satellites spaced around Earth plus one supersynchronous drifter.',
    category: 'orbital',
    educationalNotes:
      'At 42,164 km the orbital period equals one sidereal day, so the satellites hover over fixed longitudes. A small altitude change makes the drifter slide relative to them.',
    bodies: [earth, ...satellites, drifter],
    timestep: 60,
    timeScale: 3600,
    camera: { position: [0, 9, 14], target: [0, 0, 0], suggestedDistance: 18 },
    tags: ['geostationary', 'earth', 'satellites'],
  });
}

const scenarioFactories: Array<() => Scenario> = [
  earthVenusTransfer,
  plutoCharonBinary,
  jupiterSaturnResonance,
  unequalBinaryProbe,
  marsCaptureAttempt,
  lunarFreeReturn,
  trojanAsteroidPair,
  cometBreakup,
  compactBinaryInspiral,
  kuiperBeltSample,
  threeStarHierarchy,
  retrogradeComparison,
  highEccentricityComets,
  geostationaryRing,
];

/** Builds a fresh, deeply deterministic copy of every extra scenario. */
export function createExtraScenarios(): Scenario[] {
  return scenarioFactories.map((factory) => factory());
}

export const EXTRA_SCENARIOS: Scenario[] = createExtraScenarios();
