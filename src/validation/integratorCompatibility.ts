import { isFiniteNumber } from './guards';
import { makeIssue, setStringRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Integrator/step/collision combinations that behave badly in the solver. */

const EULER_STEP_LIMIT = 600;
const DYNAMICAL_STEP_RATIO = 2;
const MAX_BODIES_CHECKED = 32;

export function checkIntegratorCompatibility(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { settings, bodies } = universe;
  const { integrator, timestep } = settings;

  if (settings.collisionsEnabled && settings.collisionMode === 'none') {
    issues.push(
      makeIssue(
        ISSUE_CODES.COLLISION_SETTINGS_MISMATCH,
        'warning',
        'Collisions are enabled but the collision mode is "none".',
        'settings.collisionMode',
        {
          details: { collisionMode: settings.collisionMode },
          repair: setStringRepair('settings.collisionMode', 'merge', 'Use merge collisions.'),
        },
      ),
    );
  }

  if (integrator === 'euler' && isFiniteNumber(timestep) && timestep > EULER_STEP_LIMIT) {
    issues.push(
      makeIssue(
        ISSUE_CODES.TIMESTEP_TOO_LARGE,
        'warning',
        `Explicit Euler with a ${timestep} s step will drift badly.`,
        'settings.integrator',
        {
          details: { timestep, limit: EULER_STEP_LIMIT },
          repair: setStringRepair('settings.integrator', 'velocity-verlet', 'Use a symplectic integrator.'),
        },
      ),
    );
  }

  if (integrator === 'rk4' && isFiniteNumber(timestep) && timestep > 86400) {
    issues.push(
      makeIssue(
        ISSUE_CODES.TIMESTEP_TOO_LARGE,
        'warning',
        'RK4 with a very large step is wasteful and can lose accuracy.',
        'settings.timestep',
        { details: { timestep } },
      ),
    );
  }

  const indexById = new Map(bodies.map((body, index) => [body.id, index]));
  let checked = 0;
  for (const body of bodies) {
    if (checked >= MAX_BODIES_CHECKED || body.parentId === null) continue;
    const parentIndex = indexById.get(body.parentId);
    if (parentIndex === undefined) continue;
    const parent = bodies[parentIndex];
    const { mass, position } = body.physical;
    const parentMass = parent.physical.mass;
    const parentPosition = parent.physical.position;
    if (
      !isFiniteNumber(mass) ||
      !isFiniteNumber(parentMass) ||
      mass <= 0 ||
      parentMass <= 0 ||
      !isFiniteNumber(settings.G) ||
      settings.G <= 0 ||
      !isFiniteNumber(timestep)
    ) {
      continue;
    }
    const radius = Math.hypot(
      position.x - parentPosition.x,
      position.y - parentPosition.y,
      position.z - parentPosition.z,
    );
    const mu = settings.G * (mass + parentMass);
    if (!isFiniteNumber(radius) || radius <= 0 || !isFiniteNumber(mu) || mu <= 0) continue;
    checked += 1;
    const dynamicalTime = Math.sqrt(radius ** 3 / mu);
    if (isFiniteNumber(dynamicalTime) && timestep > DYNAMICAL_STEP_RATIO * dynamicalTime) {
      issues.push(
        makeIssue(
          ISSUE_CODES.TIMESTEP_TOO_LARGE,
          'warning',
          `Timestep is much larger than the dynamical time around '${parent.id}'.`,
          'settings.timestep',
          { bodyId: body.id, details: { timestep, dynamicalTime } },
        ),
      );
    }
  }

  if (bodies.length > 0 && bodies.every((body) => body.locked)) {
    issues.push(
      makeIssue(
        ISSUE_CODES.INTEGRATOR_MISMATCH,
        'info',
        'All bodies are locked, so the integrator will not advance any state.',
        'bodies',
        { details: { integrator } },
      ),
    );
  }
  return issues;
}
