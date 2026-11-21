/**
 * Pure, validated astrophysics analysis helpers.
 *
 * These functions are independent of the simulation world so they can be reused
 * by panels, scenario tooling and tests. Every numeric input is checked for
 * finiteness, magnitudes are checked for negativity, and every return value is
 * checked to be finite. RangeError is reserved for genuinely invalid physical
 * domains (negative masses, zero radii, superluminal speeds, and similar).
 *
 * Newtonian and weak-field expressions here are educational approximations:
 * they are not full general-relativity, tidal-deformation, atmospheric or
 * crater-formation models. The relativistic helpers use idealised Schwarzschild
 * and special-relativistic formulas as teaching estimates rather than precision
 * models of real compact objects or arbitrary spacetimes.
 */

import { AU, C, G } from '../numeric';

/** IAU nominal solar luminosity, W. */
const SOLAR_LUMINOSITY = 3.828e26;
/** Stefan–Boltzmann constant, W·m⁻²·K⁻⁴ (CODATA 2018). */
const STEFAN_BOLTZMANN = 5.670374419e-8;
/** Conservative inner edge: 1.1 times the present solar flux at Earth. */
const HABITABLE_INNER_FLUX = 1.1;
/** Conservative outer edge: 0.36 times the present solar flux at Earth. */
const HABITABLE_OUTER_FLUX = 0.36;
/** Order-of-magnitude coefficient for gravity-scaled transient crater diameter. */
const CRATER_SCALING_COEFFICIENT = 1.2;

function requireFinite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
  return value;
}

function requireNonNegative(name: string, value: number): number {
  const checked = requireFinite(name, value);
  if (checked < 0) {
    throw new RangeError(`${name} must be non-negative`);
  }
  return checked;
}

function requirePositive(name: string, value: number): number {
  const checked = requireFinite(name, value);
  if (checked <= 0) {
    throw new RangeError(`${name} must be positive`);
  }
  return checked;
}

function finiteResult(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} is outside the finite representable range for these inputs`);
  }
  return value;
}

function radiusFromAltitude(bodyRadius: number, altitude: number): number {
  const surface = requirePositive('bodyRadius', bodyRadius);
  const height = requireNonNegative('altitude', altitude);
  return finiteResult(surface + height, 'radius');
}

function requireSecondaryMassRatio(name: string, massRatio: number): number {
  const checked = requireNonNegative(name, massRatio);
  if (checked > 0.5) {
    throw new RangeError(`${name} must not exceed 0.5 when the primary is the heavier body`);
  }
  return checked;
}

/**
 * Newtonian surface or altitude gravity outside a spherical body, m/s².
 *
 * Assumes the mass is concentrated at the centre and the evaluation point is
 * on or above the surface. It ignores rotation, oblateness and local density
 * variations; altitude is measured from the mean radius, not from the geoid.
 */
export function surfaceGravityAtAltitude(mass: number, bodyRadius: number, altitude: number): number {
  const m = requireNonNegative('mass', mass);
  const r = radiusFromAltitude(bodyRadius, altitude);
  return finiteResult((G * (m / r)) / r, 'surface gravity');
}

/**
 * Escape speed at an altitude above a spherical body, m/s.
 *
 * Uses the point-mass Newtonian potential with zero speed at infinity. It
 * ignores atmospheric drag, rotation, other bodies and relativistic corrections.
 */
export function escapeSpeedAtAltitude(mass: number, bodyRadius: number, altitude: number): number {
  const m = requireNonNegative('mass', mass);
  const r = radiusFromAltitude(bodyRadius, altitude);
  return finiteResult(Math.sqrt(2 * G * (m / r)), 'escape speed');
}

/**
 * Laplace sphere-of-influence radius for a small body orbiting a primary, m.
 *
 * r ≈ a · (m/M)^(2/5). This is the patch-conic estimate used for trajectory
 * design; it is distinct from the Hill radius and is only meaningful when
 * m ≪ M and the orbit is approximately circular.
 */
export function sphereOfInfluenceRadius(
  semiMajorAxis: number,
  bodyMass: number,
  primaryMass: number,
): number {
  const a = requirePositive('semiMajorAxis', semiMajorAxis);
  const m = requireNonNegative('bodyMass', bodyMass);
  const primary = requirePositive('primaryMass', primaryMass);
  return finiteResult(a * Math.pow(m / primary, 0.4), 'sphere-of-influence radius');
}

/**
 * Hill radius expressed through the mass ratio instead of two masses, m.
 *
 * r_H ≈ a · (μ/3)^(1/3), where μ = m/(M+m). Assumes μ ≤ 0.5 so the named
 * primary really is the heavier body, and μ ≪ 1 for the expansion to be
 * accurate. It is a circular restricted three-body estimate, not a hard edge.
 */
export function hillRadiusFromMassRatio(semiMajorAxis: number, massRatio: number): number {
  const a = requirePositive('semiMajorAxis', semiMajorAxis);
  const mu = requireSecondaryMassRatio('massRatio', massRatio);
  return finiteResult(a * Math.cbrt(mu / 3), 'Hill radius');
}

/**
 * Rigid-body Roche limit for a satellite with the given mean densities, m.
 *
 * d ≈ 1.26 · R · (ρ_primary/ρ_satellite)^(1/3). This is the cohesive/rigid
 * estimate; the fluid estimate uses a larger coefficient and allows deformation.
 * It ignores material strength, shape and rotation.
 */
export function rocheLimitRigid(
  primaryRadius: number,
  primaryDensity: number,
  satelliteDensity: number,
): number {
  const radius = requirePositive('primaryRadius', primaryRadius);
  const primaryDensityChecked = requirePositive('primaryDensity', primaryDensity);
  const satelliteDensityChecked = requirePositive('satelliteDensity', satelliteDensity);
  return finiteResult(
    1.26 * radius * Math.cbrt(primaryDensityChecked / satelliteDensityChecked),
    'rigid Roche limit',
  );
}

/**
 * Keplerian orbital period from semi-major axis, s.
 *
 * P = 2π · a · sqrt(a/μ), with μ = G(M+m). This is the strictly validated
 * counterpart of the engine's permissive `orbitalPeriod`: bound, finite orbits
 * require a > 0 and μ > 0. It assumes an isolated two-body ellipse.
 */
export function orbitalPeriodFromSemiMajorAxis(semiMajorAxis: number, mu: number): number {
  const a = requirePositive('semiMajorAxis', semiMajorAxis);
  const gravitationalParameter = requirePositive('mu', mu);
  return finiteResult(2 * Math.PI * a * Math.sqrt(a / gravitationalParameter), 'orbital period');
}

/**
 * Synodic period between two prograde circular periods, s.
 *
 * S = 1/|1/P₁ − 1/P₂|. Identical periods never align periodically, so they are
 * rejected instead of returning Infinity. The formula uses mean motions and
 * ignores eccentricity and retrograde sign conventions.
 */
export function synodicPeriod(periodA: number, periodB: number): number {
  const first = requirePositive('periodA', periodA);
  const second = requirePositive('periodB', periodB);
  const inverseDifference = Math.abs(1 / first - 1 / second);
  if (inverseDifference === 0) {
    throw new RangeError('identical periods do not define a finite synodic period');
  }
  return finiteResult(1 / inverseDifference, 'synodic period');
}

/**
 * Specific orbital energy, J/kg.
 *
 * ε = v²/2 − μ/r for a point mass. Zero is the parabolic boundary, negative
 * values are bound and positive values are unbound. This is an instantaneous
 * two-body quantity and ignores all other bodies and non-gravitational forces.
 */
export function specificOrbitalEnergy(mu: number, radius: number, speed: number): number {
  const gravitationalParameter = requireNonNegative('mu', mu);
  const r = requirePositive('radius', radius);
  const v = requireNonNegative('speed', speed);
  return finiteResult((v * v) / 2 - gravitationalParameter / r, 'specific orbital energy');
}

/**
 * Specific angular momentum from the transverse speed component, m²/s.
 *
 * h = r · v_transverse. Only the component perpendicular to the radius counts;
 * the radial component contributes nothing. This assumes a point-mass two-body
 * orbit and uses no softening.
 */
export function specificAngularMomentum(radius: number, transverseSpeed: number): number {
  const r = requirePositive('radius', radius);
  const speed = requireNonNegative('transverseSpeed', transverseSpeed);
  return finiteResult(r * speed, 'specific angular momentum');
}

/**
 * Gravitational potential per unit test mass of a point mass, J/kg.
 *
 * Φ = −μ/r with Φ(∞) = 0. It is negative for attractive gravity and is the
 * unsoftened Newtonian value; it does not include relativistic corrections.
 */
export function gravitationalPotential(mu: number, radius: number): number {
  const gravitationalParameter = requireNonNegative('mu', mu);
  const r = requirePositive('radius', radius);
  if (gravitationalParameter === 0) return 0;
  return finiteResult(-gravitationalParameter / r, 'gravitational potential');
}

/**
 * Tidal acceleration across a small body's radius, m/s².
 *
 * a_tidal ≈ 2μR/r³, the difference between the centre and near-side point-mass
 * accelerations. It requires the satellite to lie outside the source (r > R)
 * and r ≫ R for the linearisation to be useful. This weak-field estimate
 * ignores self-gravity, rotation and deformation.
 */
export function tidalAcceleration(mu: number, bodyRadius: number, separation: number): number {
  const gravitationalParameter = requireNonNegative('mu', mu);
  const radius = requireNonNegative('bodyRadius', bodyRadius);
  const distance = requirePositive('separation', separation);
  if (distance <= radius) {
    throw new RangeError('separation must exceed bodyRadius for an external tidal estimate');
  }
  return finiteResult(
    (2 * gravitationalParameter * (radius / distance)) / (distance * distance),
    'tidal acceleration',
  );
}

/**
 * Schwarzschild radius of a non-rotating, uncharged mass, m.
 *
 * r_s = 2GM/c². This is the idealised Schwarzschild horizon scale used as an
 * educational estimate, not a model of rotating or charged horizons. Real
 * compact objects have different horizon structure.
 */
export function schwarzschildRadius(mass: number): number {
  const m = requireNonNegative('mass', mass);
  return finiteResult((2 * G * m) / (C * C), 'Schwarzschild radius');
}

/**
 * Photon-sphere radius for a Schwarzschild black hole, m.
 *
 * r_ph = 3GM/c² = 1.5 r_s, the idealised radius of unstable circular null
 * orbits. This educational Schwarzschild-model estimate does not apply to Kerr
 * or Reissner–Nordström spacetimes and says nothing about the visible
 * accretion-disc edge.
 */
export function photonSphereRadius(mass: number): number {
  const m = requireNonNegative('mass', mass);
  return finiteResult((3 * G * m) / (C * C), 'photon-sphere radius');
}

/**
 * Gravitational time dilation factor for a static observer, dimensionless.
 *
 * sqrt(1 − r_s/r) is the Schwarzschild-model proper-time rate relative to a
 * clock at infinity, used here as an educational estimate. It is only defined
 * outside the idealised horizon (r > r_s), assumes zero angular momentum and
 * ignores cosmological expansion. Near a horizon the static-observer
 * assumption itself becomes unphysical, and real metrics differ.
 */
export function gravitationalTimeDilationFactor(mass: number, radius: number): number {
  const horizon = schwarzschildRadius(mass);
  const r = requirePositive('radius', radius);
  if (r <= horizon) {
    throw new RangeError('radius must be greater than the Schwarzschild radius');
  }
  return finiteResult(Math.sqrt(1 - horizon / r), 'time dilation factor');
}

/**
 * Special-relativistic Lorentz factor for a massive particle, dimensionless.
 *
 * γ = 1/sqrt(1 − (v/c)²). Input speed is a non-negative magnitude below c;
 * v ≥ c has no finite Lorentz factor for a massive particle and is rejected.
 */
export function relativisticGamma(speed: number): number {
  const v = requireNonNegative('speed', speed);
  if (v >= C) {
    throw new RangeError('speed must be below the speed of light for a massive particle');
  }
  const beta = v / C;
  return finiteResult(1 / Math.sqrt(1 - beta * beta), 'Lorentz factor');
}

/**
 * Longitudinal relativistic Doppler frequency shift, Hz.
 *
 * ratio = sqrt((1 − β)/(1 + β)) when receding and its reciprocal when
 * approaching. β is a non-negative radial speed fraction; transverse Doppler
 * shift, angle effects and gravitational redshift are not modelled.
 */
export function dopplerShift(
  emittedFrequency: number,
  radialBeta: number,
  receding: boolean = true,
): number {
  const frequency = requireNonNegative('emittedFrequency', emittedFrequency);
  const beta = requireNonNegative('radialBeta', radialBeta);
  if (beta >= 1) {
    throw new RangeError('radialBeta must be less than 1 for subluminal motion');
  }
  const ratio = receding
    ? Math.sqrt((1 - beta) / (1 + beta))
    : Math.sqrt((1 + beta) / (1 - beta));
  return finiteResult(frequency * ratio, 'Doppler-shifted frequency');
}

/**
 * Bolometric luminosity of a blackbody sphere from radius and temperature, W.
 *
 * L = 4πR²σT⁴. Assumes an ideal blackbody with uniform effective temperature;
 * real spectra, albedo, limb darkening and non-thermal emission are excluded.
 */
export function luminosityFromRadiusTemperature(radius: number, temperature: number): number {
  const r = requireNonNegative('radius', radius);
  const kelvin = requireNonNegative('temperature', temperature);
  return finiteResult(4 * Math.PI * r * r * STEFAN_BOLTZMANN * kelvin ** 4, 'luminosity');
}

/**
 * Conservative inner habitable-zone distance for a main-sequence luminosity, AU.
 *
 * d = AU · sqrt(L/(1.1 L_sun)). Uses a fixed flux threshold rather than a
 * spectral-type-dependent climate model, and ignores atmosphere, albedo,
 * clouds and orbital eccentricity. Valid only for finite, non-negative L.
 */
export function habitableZoneInnerRadius(luminosity: number): number {
  const solarLuminosities = requireNonNegative('luminosity', luminosity) / SOLAR_LUMINOSITY;
  return finiteResult(AU * Math.sqrt(solarLuminosities / HABITABLE_INNER_FLUX), 'inner HZ radius');
}

/**
 * Conservative outer habitable-zone distance for a main-sequence luminosity, AU.
 *
 * d = AU · sqrt(L/(0.36 L_sun)). Uses the maximum-greenhouse flux estimate and
 * shares the fixed-threshold limitations of `habitableZoneInnerRadius`.
 */
export function habitableZoneOuterRadius(luminosity: number): number {
  const solarLuminosities = requireNonNegative('luminosity', luminosity) / SOLAR_LUMINOSITY;
  return finiteResult(AU * Math.sqrt(solarLuminosities / HABITABLE_OUTER_FLUX), 'outer HZ radius');
}

/**
 * Kinetic energy of an impactor in the target frame, J.
 *
 * E = ½mv² with v a non-negative speed magnitude. This is the classical
 * expression; it is not valid for relativistic impact speeds.
 */
export function impactKineticEnergy(mass: number, speed: number): number {
  const m = requireNonNegative('mass', mass);
  const v = requireNonNegative('speed', speed);
  return finiteResult(0.5 * m * v * v, 'impact kinetic energy');
}

/**
 * Order-of-magnitude gravity-scaled transient crater diameter, m.
 *
 * D ≈ 1.2 · (E/(ρg))^(1/4), using impact kinetic energy, target density and
 * surface gravity. Dimensional analysis fixes the exponent, not the coefficient:
 * this educational estimate ignores impactor density, target strength,
 * porosity, oblique incidence and the transient-to-final crater transition.
 */
export function craterScalingEstimate(
  impactorMass: number,
  impactSpeed: number,
  targetDensity: number,
  surfaceGravity: number,
): number {
  const energy = impactKineticEnergy(impactorMass, impactSpeed);
  const density = requirePositive('targetDensity', targetDensity);
  const gravity = requirePositive('surfaceGravity', surfaceGravity);
  return finiteResult(
    CRATER_SCALING_COEFFICIENT * Math.sqrt(Math.sqrt(energy / (density * gravity))),
    'crater diameter estimate',
  );
}

/**
 * Tisserand parameter relative to a circular perturber, dimensionless.
 *
 * T = a_p/a + 2·sqrt((a/a_p)(1 − e²))·cos(i). It is approximately conserved in
 * the circular restricted three-body problem only; real bodies have eccentric,
 * inclined perturbers and additional resonances, so T is a diagnostic, not an
 * exact invariant. The orbit must be elliptical (0 ≤ e < 1).
 */
export function tisserandParameter(
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  perturberSemiMajorAxis: number,
): number {
  const a = requirePositive('semiMajorAxis', semiMajorAxis);
  const e = requireNonNegative('eccentricity', eccentricity);
  if (e >= 1) {
    throw new RangeError('eccentricity must be less than 1 for an elliptical orbit');
  }
  const inclinationChecked = requireNonNegative('inclination', inclination);
  if (inclinationChecked > Math.PI) {
    throw new RangeError('inclination must not exceed π radians');
  }
  const perturber = requirePositive('perturberSemiMajorAxis', perturberSemiMajorAxis);
  return finiteResult(
    perturber / a + 2 * Math.sqrt((a / perturber) * (1 - e * e)) * Math.cos(inclinationChecked),
    'Tisserand parameter',
  );
}

/**
 * L1 distance from the secondary in the collinear restricted three-body problem, m.
 *
 * d ≈ r·ε·(1 − ε/3), ε = (μ/3)^(1/3), μ = m₂/(m₁+m₂) ≤ 0.5. The expansion
 * assumes a circular orbit and a heavier primary; L1 lies between the bodies.
 */
export function lagrangeL1DistanceFromSecondary(massRatio: number, separation: number): number {
  const mu = requireSecondaryMassRatio('massRatio', massRatio);
  const distance = requirePositive('separation', separation);
  const epsilon = Math.cbrt(mu / 3);
  return finiteResult(distance * epsilon * (1 - epsilon / 3), 'L1 distance');
}

/**
 * L2 distance beyond the secondary in the collinear restricted three-body problem, m.
 *
 * d ≈ r·ε·(1 + ε/3), ε = (μ/3)^(1/3), μ = m₂/(m₁+m₂) ≤ 0.5. It shares the
 * circular-orbit and heavy-primary assumptions of `lagrangeL1DistanceFromSecondary`.
 */
export function lagrangeL2DistanceFromSecondary(massRatio: number, separation: number): number {
  const mu = requireSecondaryMassRatio('massRatio', massRatio);
  const distance = requirePositive('separation', separation);
  const epsilon = Math.cbrt(mu / 3);
  return finiteResult(distance * epsilon * (1 + epsilon / 3), 'L2 distance');
}

/**
 * L3 distance from the primary on the far side of the primary, m.
 *
 * d ≈ r·(1 − 7μ/12), first order in μ = m₂/(m₁+m₂) ≤ 0.5. This is a barycentric
 * circular restricted three-body expansion; L3 is unstable and higher-order
 * terms matter for comparable masses.
 */
export function lagrangeL3DistanceFromPrimary(massRatio: number, separation: number): number {
  const mu = requireSecondaryMassRatio('massRatio', massRatio);
  const distance = requirePositive('separation', separation);
  return finiteResult(distance * (1 - (7 * mu) / 12), 'L3 distance');
}

/**
 * Dimensionless Jacobi-constant-like value in the circular restricted three-body problem.
 *
 * C ≈ x² + y² + 2(1−μ)/r₁ + 2μ/r₂ in units where separation, total mass and
 * angular speed are one; x and y are signed barycentric coordinates. It is a
 * rotating-frame diagnostic for the idealised problem, not a conserved quantity
 * of the full N-body simulator. Distances must be positive and finite.
 */
export function jacobiConstantApproximation(
  massRatio: number,
  x: number,
  y: number,
  distanceToPrimary: number,
  distanceToSecondary: number,
): number {
  const mu = requireNonNegative('massRatio', massRatio);
  if (mu > 1) {
    throw new RangeError('massRatio must not exceed 1');
  }
  const xCoordinate = requireFinite('x', x);
  const yCoordinate = requireFinite('y', y);
  const primaryDistance = requirePositive('distanceToPrimary', distanceToPrimary);
  const secondaryDistance = requirePositive('distanceToSecondary', distanceToSecondary);
  return finiteResult(
    xCoordinate * xCoordinate +
      yCoordinate * yCoordinate +
      (2 * (1 - mu)) / primaryDistance +
      (2 * mu) / secondaryDistance,
    'Jacobi constant',
  );
}

/**
 * Population standard deviation of non-negative speed samples, m/s.
 *
 * σ = sqrt(mean(v²) − mean(v)²). It describes spread in speed magnitudes, not
 * the full three-dimensional velocity dispersion tensor, and assumes the input
 * samples are drawn from the same population. At least one sample is required;
 * a single sample yields zero spread.
 */
export function velocityDispersion(speeds: readonly number[]): number {
  if (speeds.length === 0) {
    throw new RangeError('speeds must contain at least one sample');
  }
  let sum = 0;
  let sumOfSquares = 0;
  for (const speed of speeds) {
    const value = requireNonNegative('speed sample', speed);
    sum += value;
    sumOfSquares += value * value;
  }
  const count = speeds.length;
  const mean = finiteResult(sum / count, 'mean speed');
  const variance = finiteResult(sumOfSquares / count - mean * mean, 'speed variance');
  return finiteResult(Math.sqrt(Math.max(variance, 0)), 'velocity dispersion');
}
