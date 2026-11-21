import { describe, expect, it } from 'vitest';
import * as analysis from '../engine/analysis';
import { AU, C, EARTH_MASS, EARTH_RADIUS, G, SOLAR_MASS, YEAR } from '../engine/numeric';

const MOON_DISTANCE = 3.844e8;
const SOLAR_LUMINOSITY = 3.828e26;
const STEFAN_BOLTZMANN = 5.670374419e-8;

const EXPECTED_EXPORTS = [
  'craterScalingEstimate',
  'dopplerShift',
  'escapeSpeedAtAltitude',
  'gravitationalPotential',
  'gravitationalTimeDilationFactor',
  'habitableZoneInnerRadius',
  'habitableZoneOuterRadius',
  'hillRadiusFromMassRatio',
  'impactKineticEnergy',
  'jacobiConstantApproximation',
  'lagrangeL1DistanceFromSecondary',
  'lagrangeL2DistanceFromSecondary',
  'lagrangeL3DistanceFromPrimary',
  'luminosityFromRadiusTemperature',
  'orbitalPeriodFromSemiMajorAxis',
  'photonSphereRadius',
  'relativisticGamma',
  'rocheLimitRigid',
  'schwarzschildRadius',
  'sphereOfInfluenceRadius',
  'specificAngularMomentum',
  'specificOrbitalEnergy',
  'surfaceGravityAtAltitude',
  'synodicPeriod',
  'tidalAcceleration',
  'tisserandParameter',
  'velocityDispersion',
] as const;

function expectRelative(actual: number, expected: number, tolerance = 1e-9): void {
  const scale = Math.max(1, Math.abs(expected));
  expect(Math.abs(actual - expected) / scale).toBeLessThan(tolerance);
}

describe('astrophysics analysis library surface', () => {
  it('exports exactly the documented finite-number helpers', () => {
    expect(Object.keys(analysis).sort()).toEqual([...EXPECTED_EXPORTS].sort());
    for (const name of EXPECTED_EXPORTS) {
      expect(typeof analysis[name]).toBe('function');
    }
  });
});

describe('gravity, potential and tidal estimates', () => {
  it('computes surface gravity and altitude scaling', () => {
    const surface = analysis.surfaceGravityAtAltitude(EARTH_MASS, EARTH_RADIUS, 0);
    expect(surface).toBeGreaterThan(9.7);
    expect(surface).toBeLessThan(10);
    const atOneRadius = analysis.surfaceGravityAtAltitude(EARTH_MASS, EARTH_RADIUS, EARTH_RADIUS);
    expectRelative(atOneRadius, surface / 4);
    expect(analysis.surfaceGravityAtAltitude(0, EARTH_RADIUS, 0)).toBe(0);
  });

  it('rejects invalid gravity inputs', () => {
    expect(() => analysis.surfaceGravityAtAltitude(-1, EARTH_RADIUS, 0)).toThrow(RangeError);
    expect(() => analysis.surfaceGravityAtAltitude(EARTH_MASS, 0, 0)).toThrow(RangeError);
    expect(() => analysis.surfaceGravityAtAltitude(EARTH_MASS, EARTH_RADIUS, -1)).toThrow(RangeError);
    expect(() => analysis.surfaceGravityAtAltitude(Number.NaN, EARTH_RADIUS, 0)).toThrow(RangeError);
    expect(() =>
      analysis.surfaceGravityAtAltitude(EARTH_MASS, Number.POSITIVE_INFINITY, 0),
    ).toThrow(RangeError);
  });

  it('computes escape speed at altitude and its zero-mass edge case', () => {
    const surface = analysis.escapeSpeedAtAltitude(EARTH_MASS, EARTH_RADIUS, 0);
    expect(surface).toBeGreaterThan(11_000);
    expect(surface).toBeLessThan(11_400);
    const higher = analysis.escapeSpeedAtAltitude(EARTH_MASS, EARTH_RADIUS, EARTH_RADIUS);
    expectRelative(higher, surface / Math.SQRT2);
    expect(analysis.escapeSpeedAtAltitude(0, EARTH_RADIUS, 0)).toBe(0);
    expect(() => analysis.escapeSpeedAtAltitude(EARTH_MASS, EARTH_RADIUS, -1)).toThrow(RangeError);
    expect(() => analysis.escapeSpeedAtAltitude(Number.NEGATIVE_INFINITY, EARTH_RADIUS, 0)).toThrow(
      RangeError,
    );
  });

  it('computes point-mass gravitational potential with a zero-mass edge case', () => {
    const mu = G * SOLAR_MASS;
    const potential = analysis.gravitationalPotential(mu, AU);
    expect(potential).toBeLessThan(0);
    expectRelative(potential, -mu / AU);
    expect(analysis.gravitationalPotential(0, AU)).toBe(0);
    expect(() => analysis.gravitationalPotential(mu, 0)).toThrow(RangeError);
    expect(() => analysis.gravitationalPotential(-mu, AU)).toThrow(RangeError);
    expect(() => analysis.gravitationalPotential(Number.NaN, AU)).toThrow(RangeError);
  });

  it('linearises the differential acceleration across a body', () => {
    const mu = G * EARTH_MASS;
    const tidal = analysis.tidalAcceleration(mu, EARTH_RADIUS, MOON_DISTANCE);
    expect(tidal).toBeGreaterThan(0);
    expectRelative(tidal, (2 * mu * EARTH_RADIUS) / MOON_DISTANCE ** 3);
    expect(analysis.tidalAcceleration(0, EARTH_RADIUS, MOON_DISTANCE)).toBe(0);
    expect(analysis.tidalAcceleration(mu, 0, MOON_DISTANCE)).toBe(0);
  });

  it('rejects tidal inputs outside the external-body domain', () => {
    expect(() => analysis.tidalAcceleration(G * EARTH_MASS, EARTH_RADIUS, EARTH_RADIUS)).toThrow(
      RangeError,
    );
    expect(() => analysis.tidalAcceleration(G * EARTH_MASS, -1, MOON_DISTANCE)).toThrow(RangeError);
    expect(() => analysis.tidalAcceleration(-1, EARTH_RADIUS, MOON_DISTANCE)).toThrow(RangeError);
    expect(() => analysis.tidalAcceleration(G * EARTH_MASS, EARTH_RADIUS, Number.NaN)).toThrow(
      RangeError,
    );
  });
});

describe('sphere-of-influence, Hill and Roche estimates', () => {
  it('computes the Laplace sphere of influence', () => {
    const soi = analysis.sphereOfInfluenceRadius(AU, EARTH_MASS, SOLAR_MASS);
    expect(soi).toBeGreaterThan(5e8);
    expect(soi).toBeLessThan(1.5e9);
    expectRelative(soi, AU * Math.pow(EARTH_MASS / SOLAR_MASS, 0.4));
    expect(analysis.sphereOfInfluenceRadius(AU, 0, SOLAR_MASS)).toBe(0);
    expect(() => analysis.sphereOfInfluenceRadius(0, EARTH_MASS, SOLAR_MASS)).toThrow(RangeError);
    expect(() => analysis.sphereOfInfluenceRadius(AU, -EARTH_MASS, SOLAR_MASS)).toThrow(RangeError);
    expect(() => analysis.sphereOfInfluenceRadius(AU, EARTH_MASS, 0)).toThrow(RangeError);
    expect(() => analysis.sphereOfInfluenceRadius(Number.NaN, EARTH_MASS, SOLAR_MASS)).toThrow(
      RangeError,
    );
  });

  it('computes the Hill radius from a mass ratio', () => {
    const massRatio = EARTH_MASS / (SOLAR_MASS + EARTH_MASS);
    const hill = analysis.hillRadiusFromMassRatio(AU, massRatio);
    expect(hill).toBeGreaterThan(1e9);
    expect(hill).toBeLessThan(2e9);
    expectRelative(hill, AU * Math.cbrt(massRatio / 3));
    expect(analysis.hillRadiusFromMassRatio(AU, 0)).toBe(0);
    expect(() => analysis.hillRadiusFromMassRatio(AU, 0.6)).toThrow(RangeError);
    expect(() => analysis.hillRadiusFromMassRatio(AU, -0.1)).toThrow(RangeError);
    expect(() => analysis.hillRadiusFromMassRatio(0, massRatio)).toThrow(RangeError);
    expect(() => analysis.hillRadiusFromMassRatio(Number.POSITIVE_INFINITY, massRatio)).toThrow(
      RangeError,
    );
  });

  it('uses the rigid-body Roche coefficient', () => {
    const roche = analysis.rocheLimitRigid(EARTH_RADIUS, 5500, 3000);
    expect(roche).toBeGreaterThan(EARTH_RADIUS);
    expectRelative(roche, 1.26 * EARTH_RADIUS * Math.cbrt(5500 / 3000));
    expect(() => analysis.rocheLimitRigid(0, 5500, 3000)).toThrow(RangeError);
    expect(() => analysis.rocheLimitRigid(EARTH_RADIUS, 0, 3000)).toThrow(RangeError);
    expect(() => analysis.rocheLimitRigid(EARTH_RADIUS, 5500, -1)).toThrow(RangeError);
    expect(() => analysis.rocheLimitRigid(Number.NaN, 5500, 3000)).toThrow(RangeError);
  });
});

describe('two-body orbital diagnostics', () => {
  it('computes a finite Kepler period from semi-major axis', () => {
    const mu = G * SOLAR_MASS;
    const period = analysis.orbitalPeriodFromSemiMajorAxis(AU, mu);
    expect(period).toBeGreaterThan(3.1e7);
    expect(period).toBeLessThan(3.2e7);
    expectRelative(period, 2 * Math.PI * Math.sqrt(AU ** 3 / mu));
    expect(() => analysis.orbitalPeriodFromSemiMajorAxis(0, mu)).toThrow(RangeError);
    expect(() => analysis.orbitalPeriodFromSemiMajorAxis(AU, 0)).toThrow(RangeError);
    expect(() => analysis.orbitalPeriodFromSemiMajorAxis(-AU, mu)).toThrow(RangeError);
    expect(() => analysis.orbitalPeriodFromSemiMajorAxis(AU, Number.NaN)).toThrow(RangeError);
  });

  it('computes synodic periods and rejects resonant equal periods', () => {
    const synodic = analysis.synodicPeriod(YEAR, 1.5 * YEAR);
    expectRelative(synodic, 3 * YEAR);
    expect(() => analysis.synodicPeriod(YEAR, YEAR)).toThrow(RangeError);
    expect(() => analysis.synodicPeriod(0, YEAR)).toThrow(RangeError);
    expect(() => analysis.synodicPeriod(YEAR, -YEAR)).toThrow(RangeError);
    expect(() => analysis.synodicPeriod(Number.NaN, YEAR)).toThrow(RangeError);
  });

  it('computes specific energy and angular momentum with vis-viva edge cases', () => {
    const mu = G * SOLAR_MASS;
    const circularSpeed = Math.sqrt(mu / AU);
    const energy = analysis.specificOrbitalEnergy(mu, AU, circularSpeed);
    expect(energy).toBeLessThan(0);
    expectRelative(energy, -mu / (2 * AU));
    const escapeEnergy = analysis.specificOrbitalEnergy(mu, AU, Math.sqrt((2 * mu) / AU));
    expect(Math.abs(escapeEnergy)).toBeLessThan(1e-6);
    expect(analysis.specificOrbitalEnergy(0, AU, 0)).toBe(0);

    const angularMomentum = analysis.specificAngularMomentum(AU, circularSpeed);
    expectRelative(angularMomentum, AU * circularSpeed);
    expect(analysis.specificAngularMomentum(AU, 0)).toBe(0);

    expect(() => analysis.specificOrbitalEnergy(mu, 0, circularSpeed)).toThrow(RangeError);
    expect(() => analysis.specificOrbitalEnergy(-mu, AU, circularSpeed)).toThrow(RangeError);
    expect(() => analysis.specificOrbitalEnergy(mu, AU, -circularSpeed)).toThrow(RangeError);
    expect(() => analysis.specificAngularMomentum(0, circularSpeed)).toThrow(RangeError);
    expect(() => analysis.specificAngularMomentum(AU, Number.NaN)).toThrow(RangeError);
  });
});

describe('relativistic approximations', () => {
  it('computes Schwarzschild and photon-sphere radii', () => {
    const horizon = analysis.schwarzschildRadius(SOLAR_MASS);
    expect(horizon).toBeGreaterThan(2900);
    expect(horizon).toBeLessThan(3000);
    expectRelative(horizon, (2 * G * SOLAR_MASS) / (C * C));
    expect(analysis.schwarzschildRadius(0)).toBe(0);

    const photonSphere = analysis.photonSphereRadius(SOLAR_MASS);
    expectRelative(photonSphere, 1.5 * horizon);
    expect(analysis.photonSphereRadius(0)).toBe(0);

    expect(() => analysis.schwarzschildRadius(-SOLAR_MASS)).toThrow(RangeError);
    expect(() => analysis.photonSphereRadius(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => analysis.photonSphereRadius(Number.NaN)).toThrow(RangeError);
  });

  it('computes a static-observer time dilation factor only outside the horizon', () => {
    expect(analysis.gravitationalTimeDilationFactor(0, EARTH_RADIUS)).toBe(1);
    const nearEarth = analysis.gravitationalTimeDilationFactor(EARTH_MASS, EARTH_RADIUS);
    expect(nearEarth).toBeLessThan(1);
    expect(nearEarth).toBeGreaterThan(0.999999999);
    const horizon = analysis.schwarzschildRadius(SOLAR_MASS);
    expectRelative(analysis.gravitationalTimeDilationFactor(SOLAR_MASS, 2 * horizon), Math.SQRT1_2);
    expect(() => analysis.gravitationalTimeDilationFactor(SOLAR_MASS, horizon)).toThrow(RangeError);
    expect(() => analysis.gravitationalTimeDilationFactor(SOLAR_MASS, horizon / 2)).toThrow(
      RangeError,
    );
    expect(() => analysis.gravitationalTimeDilationFactor(-SOLAR_MASS, AU)).toThrow(RangeError);
    expect(() => analysis.gravitationalTimeDilationFactor(SOLAR_MASS, Number.NaN)).toThrow(
      RangeError,
    );
  });

  it('computes the Lorentz factor below c', () => {
    expect(analysis.relativisticGamma(0)).toBe(1);
    expect(analysis.relativisticGamma(0.6 * C)).toBeCloseTo(1.25, 12);
    expect(analysis.relativisticGamma(0.8 * C)).toBeCloseTo(5 / 3, 12);
    expect(() => analysis.relativisticGamma(C)).toThrow(RangeError);
    expect(() => analysis.relativisticGamma(2 * C)).toThrow(RangeError);
    expect(() => analysis.relativisticGamma(-C / 2)).toThrow(RangeError);
    expect(() => analysis.relativisticGamma(Number.NaN)).toThrow(RangeError);
  });

  it('applies the longitudinal Doppler shift in both directions', () => {
    expect(analysis.dopplerShift(1e12, 0)).toBe(1e12);
    expectRelative(analysis.dopplerShift(1e12, 0.6, true), 1e12 * 0.5);
    expectRelative(analysis.dopplerShift(1e12, 0.6, false), 1e12 * 2);
    expect(analysis.dopplerShift(0, 0.5)).toBe(0);
    expect(() => analysis.dopplerShift(1e12, 1)).toThrow(RangeError);
    expect(() => analysis.dopplerShift(1e12, -0.1)).toThrow(RangeError);
    expect(() => analysis.dopplerShift(-1, 0.1)).toThrow(RangeError);
    expect(() => analysis.dopplerShift(Number.POSITIVE_INFINITY, 0.1)).toThrow(RangeError);
  });
});

describe('radiation and habitability estimates', () => {
  it('computes blackbody luminosity from radius and effective temperature', () => {
    const expected = 4 * Math.PI * EARTH_RADIUS ** 2 * STEFAN_BOLTZMANN * 288 ** 4;
    const luminosity = analysis.luminosityFromRadiusTemperature(EARTH_RADIUS, 288);
    expectRelative(luminosity, expected);
    expect(luminosity).toBeGreaterThan(1e17);
    expect(analysis.luminosityFromRadiusTemperature(EARTH_RADIUS, 0)).toBe(0);
    expect(analysis.luminosityFromRadiusTemperature(0, 288)).toBe(0);
    expect(() => analysis.luminosityFromRadiusTemperature(-EARTH_RADIUS, 288)).toThrow(RangeError);
    expect(() => analysis.luminosityFromRadiusTemperature(EARTH_RADIUS, -1)).toThrow(RangeError);
    expect(() => analysis.luminosityFromRadiusTemperature(EARTH_RADIUS, Number.NaN)).toThrow(
      RangeError,
    );
  });

  it('brackets the conservative habitable zone around the solar flux', () => {
    const inner = analysis.habitableZoneInnerRadius(SOLAR_LUMINOSITY);
    const outer = analysis.habitableZoneOuterRadius(SOLAR_LUMINOSITY);
    expect(inner).toBeLessThan(AU);
    expect(outer).toBeGreaterThan(AU);
    expectRelative(inner, AU * Math.sqrt(1 / 1.1));
    expectRelative(outer, AU * Math.sqrt(1 / 0.36));
    expect(analysis.habitableZoneInnerRadius(0)).toBe(0);
    expect(analysis.habitableZoneOuterRadius(0)).toBe(0);
    expect(() => analysis.habitableZoneInnerRadius(-SOLAR_LUMINOSITY)).toThrow(RangeError);
    expect(() => analysis.habitableZoneOuterRadius(-SOLAR_LUMINOSITY)).toThrow(RangeError);
    expect(() => analysis.habitableZoneInnerRadius(Number.NaN)).toThrow(RangeError);
    expect(() => analysis.habitableZoneOuterRadius(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('impact estimates', () => {
  it('computes impact kinetic energy with classical scaling', () => {
    expect(analysis.impactKineticEnergy(1000, 1000)).toBe(5e8);
    expect(analysis.impactKineticEnergy(0, 1000)).toBe(0);
    expect(analysis.impactKineticEnergy(1000, 0)).toBe(0);
    expect(() => analysis.impactKineticEnergy(-1, 1000)).toThrow(RangeError);
    expect(() => analysis.impactKineticEnergy(1000, -1)).toThrow(RangeError);
    expect(() => analysis.impactKineticEnergy(1000, Number.NaN)).toThrow(RangeError);
  });

  it('scales crater diameter with the fourth root of energy', () => {
    const energy = analysis.impactKineticEnergy(1000, 1000);
    const expected = 1.2 * Math.sqrt(Math.sqrt(energy / (3000 * 9.81)));
    const diameter = analysis.craterScalingEstimate(1000, 1000, 3000, 9.81);
    expectRelative(diameter, expected);
    expect(diameter).toBeGreaterThan(0);
    expect(analysis.craterScalingEstimate(0, 1000, 3000, 9.81)).toBe(0);
    expect(() => analysis.craterScalingEstimate(1000, 1000, 0, 9.81)).toThrow(RangeError);
    expect(() => analysis.craterScalingEstimate(1000, 1000, 3000, 0)).toThrow(RangeError);
    expect(() => analysis.craterScalingEstimate(1000, -1000, 3000, 9.81)).toThrow(RangeError);
    expect(() => analysis.craterScalingEstimate(1e308, 1e308, 3000, 9.81)).toThrow(RangeError);
  });
});

describe('restricted three-body diagnostics', () => {
  it('computes the Tisserand parameter for bound ellipses', () => {
    expect(analysis.tisserandParameter(AU, 0, 0, AU)).toBeCloseTo(3, 12);
    const eccentric = analysis.tisserandParameter(AU, 0.5, 0, AU);
    expectRelative(eccentric, 1 + 2 * Math.sqrt(0.75));
    const inclined = analysis.tisserandParameter(AU, 0, Math.PI / 2, AU);
    expectRelative(inclined, 1);
    expect(() => analysis.tisserandParameter(0, 0, 0, AU)).toThrow(RangeError);
    expect(() => analysis.tisserandParameter(AU, -0.1, 0, AU)).toThrow(RangeError);
    expect(() => analysis.tisserandParameter(AU, 1, 0, AU)).toThrow(RangeError);
    expect(() => analysis.tisserandParameter(AU, 0, Math.PI + 0.1, AU)).toThrow(RangeError);
    expect(() => analysis.tisserandParameter(AU, 0, 0, 0)).toThrow(RangeError);
    expect(() => analysis.tisserandParameter(Number.NaN, 0, 0, AU)).toThrow(RangeError);
  });

  it('approximates the collinear Lagrange point distances', () => {
    const massRatio = EARTH_MASS / (SOLAR_MASS + EARTH_MASS);
    const epsilon = Math.cbrt(massRatio / 3);
    const l1 = analysis.lagrangeL1DistanceFromSecondary(massRatio, AU);
    const l2 = analysis.lagrangeL2DistanceFromSecondary(massRatio, AU);
    const l3 = analysis.lagrangeL3DistanceFromPrimary(massRatio, AU);
    expectRelative(l1, AU * epsilon * (1 - epsilon / 3));
    expectRelative(l2, AU * epsilon * (1 + epsilon / 3));
    expectRelative(l3, AU * (1 - (7 * massRatio) / 12));
    expect(l2).toBeGreaterThan(l1);
    expect(l3).toBeLessThan(AU);
    expect(l3).toBeGreaterThan(0.9 * AU);

    expect(analysis.lagrangeL1DistanceFromSecondary(0, AU)).toBe(0);
    expect(analysis.lagrangeL2DistanceFromSecondary(0, AU)).toBe(0);
    expect(analysis.lagrangeL3DistanceFromPrimary(0, AU)).toBe(AU);
    expect(() => analysis.lagrangeL1DistanceFromSecondary(0.6, AU)).toThrow(RangeError);
    expect(() => analysis.lagrangeL2DistanceFromSecondary(-0.1, AU)).toThrow(RangeError);
    expect(() => analysis.lagrangeL3DistanceFromPrimary(massRatio, 0)).toThrow(RangeError);
    expect(() => analysis.lagrangeL1DistanceFromSecondary(Number.NaN, AU)).toThrow(RangeError);
  });

  it('computes a normalised Jacobi-constant-like diagnostic', () => {
    const jacobi = analysis.jacobiConstantApproximation(0.001, 0.5, 0, 0.5, 0.5);
    expectRelative(jacobi, 4.25);
    expectRelative(analysis.jacobiConstantApproximation(1, 0, 0, 1, 1), 2);
    expectRelative(analysis.jacobiConstantApproximation(0, 0, 0, 1, 1), 2);
    expect(() => analysis.jacobiConstantApproximation(-0.1, 0, 0, 1, 1)).toThrow(RangeError);
    expect(() => analysis.jacobiConstantApproximation(1.1, 0, 0, 1, 1)).toThrow(RangeError);
    expect(() => analysis.jacobiConstantApproximation(0, Number.NaN, 0, 1, 1)).toThrow(RangeError);
    expect(() => analysis.jacobiConstantApproximation(0, 0, Number.POSITIVE_INFINITY, 1, 1)).toThrow(
      RangeError,
    );
    expect(() => analysis.jacobiConstantApproximation(0, 0, 0, 0, 1)).toThrow(RangeError);
    expect(() => analysis.jacobiConstantApproximation(0, 0, 0, 1, -1)).toThrow(RangeError);
  });
});

describe('statistical diagnostics', () => {
  it('computes population velocity dispersion', () => {
    expect(analysis.velocityDispersion([1, 3])).toBeCloseTo(1, 12);
    expect(analysis.velocityDispersion([2, 4, 6])).toBeCloseTo(Math.sqrt(8 / 3), 12);
    expect(analysis.velocityDispersion([5])).toBe(0);
    expect(analysis.velocityDispersion([0, 0, 0])).toBe(0);
    expect(() => analysis.velocityDispersion([])).toThrow(RangeError);
    expect(() => analysis.velocityDispersion([1, -1])).toThrow(RangeError);
    expect(() => analysis.velocityDispersion([1, Number.NaN])).toThrow(RangeError);
    expect(() => analysis.velocityDispersion([1, Number.POSITIVE_INFINITY])).toThrow(RangeError);
  });
});
