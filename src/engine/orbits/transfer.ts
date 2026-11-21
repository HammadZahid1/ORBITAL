/** Two-impulse Hohmann transfer between coplanar circular orbits. */
export interface HohmannTransfer {
  initialCircularSpeed: number;
  transferPeriapsisSpeed: number;
  transferApoapsisSpeed: number;
  finalCircularSpeed: number;
  departureBurn: number;
  arrivalBurn: number;
  totalDeltaV: number;
  transferTime: number;
  semiMajorAxis: number;
  eccentricity: number;
}

/**
 * Classical coplanar Hohmann transfer. Assumes point masses, circular start and
 * target orbits and instantaneous impulses; real mission design needs more.
 */
export function hohmannTransfer(mu: number, radius1: number, radius2: number): HohmannTransfer | null {
  if (mu <= 0 || radius1 <= 0 || radius2 <= 0 || radius1 === radius2) return null;
  const r1 = Math.min(radius1, radius2);
  const r2 = Math.max(radius1, radius2);
  const semiMajorAxis = (r1 + r2) / 2;
  const circular1 = Math.sqrt(mu / r1);
  const circular2 = Math.sqrt(mu / r2);
  const periapsis = Math.sqrt(mu * (2 / r1 - 1 / semiMajorAxis));
  const apoapsis = Math.sqrt(mu * (2 / r2 - 1 / semiMajorAxis));
  const departureBurn = Math.abs(periapsis - circular1);
  const arrivalBurn = Math.abs(circular2 - apoapsis);
  return {
    initialCircularSpeed: circular1,
    transferPeriapsisSpeed: periapsis,
    transferApoapsisSpeed: apoapsis,
    finalCircularSpeed: circular2,
    departureBurn,
    arrivalBurn,
    totalDeltaV: departureBurn + arrivalBurn,
    transferTime: Math.PI * Math.sqrt(semiMajorAxis ** 3 / mu),
    semiMajorAxis,
    eccentricity: (r2 - r1) / (r2 + r1),
  };
}
