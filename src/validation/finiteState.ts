import { G } from '../engine/numeric';
import { isFiniteNumber } from './guards';
import { bodyPath, makeIssue, setNumberRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';
import type { Vec3 } from '../types/vector';

/** Detects NaN/Infinity anywhere in physical, visual and settings state. */

const COMPONENTS = ['x', 'y', 'z'] as const;
const VECTOR_FALLBACK: Vec3 = { x: 0, y: 0, z: 0 };

function checkNumber(
  value: number,
  path: string,
  fallback: number,
  issues: ValidationIssue[],
  bodyId?: string,
): boolean {
  if (isFiniteNumber(value)) return true;
  issues.push(
    makeIssue(ISSUE_CODES.NON_FINITE_NUMBER, 'error', `${path} is not a finite number.`, path, {
      bodyId,
      details: { value: String(value) },
      repair: setNumberRepair(path, fallback, `Replace ${path} with ${fallback}.`),
    }),
  );
  return false;
}

function checkVector(
  value: Vec3,
  path: string,
  issues: ValidationIssue[],
  bodyId?: string,
): void {
  for (const component of COMPONENTS) {
    checkNumber(value[component], `${path}.${component}`, VECTOR_FALLBACK[component], issues, bodyId);
  }
}

export function checkFiniteState(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  universe.bodies.forEach((body, index) => {
    const root = bodyPath(index);
    const physicalPath = `${root}.physical`;
    checkNumber(body.physical.mass, `${physicalPath}.mass`, 1, issues, body.id);
    checkNumber(body.physical.radius, `${physicalPath}.radius`, 1, issues, body.id);
    checkNumber(body.physical.rotation, `${physicalPath}.rotation`, 0, issues, body.id);
    checkNumber(body.physical.rotationSpeed, `${physicalPath}.rotationSpeed`, 0, issues, body.id);
    checkVector(body.physical.position, `${physicalPath}.position`, issues, body.id);
    checkVector(body.physical.velocity, `${physicalPath}.velocity`, issues, body.id);
    checkVector(body.physical.acceleration, `${physicalPath}.acceleration`, issues, body.id);

    const visualPath = `${root}.visual`;
    checkNumber(body.visual.emissiveIntensity, `${visualPath}.emissiveIntensity`, 0, issues, body.id);
    checkNumber(body.visual.opacity, `${visualPath}.opacity`, 1, issues, body.id);
    checkNumber(body.visual.visualScale, `${visualPath}.visualScale`, 1, issues, body.id);
    checkNumber(body.visual.trail.length, `${visualPath}.trail.length`, 240, issues, body.id);
    checkNumber(body.visual.trail.opacity, `${visualPath}.trail.opacity`, 0.65, issues, body.id);
  });

  const { settings } = universe;
  checkNumber(settings.G, 'settings.G', G, issues);
  checkNumber(settings.softening, 'settings.softening', 1e5, issues);
  checkNumber(settings.timestep, 'settings.timestep', 3600, issues);
  checkNumber(settings.timeScale, 'settings.timeScale', 3600, issues);
  checkNumber(universe.createdAt, 'createdAt', 0, issues);
  checkNumber(universe.updatedAt, 'updatedAt', 0, issues);
  return issues;
}
