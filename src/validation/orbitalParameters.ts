import { calculateOrbitalElements } from '../engine/orbits/orbital';
import { C } from '../engine/numeric';
import { worldFromBodies } from '../engine/physics/world';
import { isFiniteNumber } from './guards';
import { bodyPath, makeIssue, setNullRepair, setVectorRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';
import type { Vec3 } from '../types/vector';

/** Osculating orbital sanity for bodies with a resolvable parent. */

const MAX_SEMIMAJOR_AXIS = 1e25;
const HIGH_ECCENTRICITY = 5;

export function checkOrbitalParameters(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { bodies, settings } = universe;
  if (bodies.length === 0) return issues;

  const indexById = new Map<string, number>();
  bodies.forEach((body, index) => {
    if (!indexById.has(body.id)) indexById.set(body.id, index);
  });
  const world = worldFromBodies(bodies, {
    G: settings.G,
    softening: settings.softening,
    collisionMode: settings.collisionMode,
    collisionsEnabled: settings.collisionsEnabled,
  });

  bodies.forEach((body, index) => {
    if (body.parentId === null) return;
    const parentIndex = indexById.get(body.parentId);
    if (parentIndex === undefined || parentIndex === index) return;
    const parent = bodies[parentIndex];

    const values = [body.physical.mass, body.physical.radius, parent.physical.mass, parent.physical.radius];
    const vectors = [
      body.physical.position,
      body.physical.velocity,
      parent.physical.position,
      parent.physical.velocity,
    ];
    if (!settings.G || !isFiniteNumber(settings.G)) return;
    if (!values.every(isFiniteNumber) || values.some((value) => value <= 0)) return;
    if (!vectors.every((vector) => [vector.x, vector.y, vector.z].every(isFiniteNumber))) return;

    const root = bodyPath(index);
    const elements = calculateOrbitalElements(world, index, parentIndex);
    if (elements === null) {
      const offset = parent.physical.radius + body.physical.radius + 1e3;
      const position: Vec3 = {
        x: parent.physical.position.x + offset,
        y: parent.physical.position.y,
        z: parent.physical.position.z,
      };
      issues.push(
        makeIssue(
          ISSUE_CODES.ORBIT_COINCIDENT,
          'error',
          `Body '${body.id}' coincides with its parent '${parent.id}'.`,
          `${root}.physical.position`,
          {
            bodyId: body.id,
            details: { parentId: parent.id },
            repair: setVectorRepair(
              `${root}.physical.position`,
              position,
              'Offset the body just beyond the parent surface.',
            ),
          },
        ),
      );
      return;
    }

    if (!isFiniteNumber(elements.eccentricity) || !isFiniteNumber(elements.specificEnergy)) {
      issues.push(
        makeIssue(
          ISSUE_CODES.ORBIT_NON_FINITE,
          'error',
          `Orbital elements for '${body.id}' are not finite.`,
          root,
          { bodyId: body.id },
        ),
      );
      return;
    }

    if (elements.speed >= C) {
      issues.push(
        makeIssue(
          ISSUE_CODES.ORBIT_SUPERLUMINAL,
          'error',
          `Relative orbital speed for '${body.id}' is at or above the speed of light.`,
          `${root}.physical.velocity`,
          { bodyId: body.id, details: { speed: elements.speed, speedOfLight: C } },
        ),
      );
    }

    if (elements.eccentricity >= 1) {
      if (elements.eccentricity > HIGH_ECCENTRICITY) {
        issues.push(
          makeIssue(
            ISSUE_CODES.ORBIT_ECCENTRICITY_EXTREME,
            'warning',
            `Unbound orbit for '${body.id}' has an extreme eccentricity.`,
            root,
            { bodyId: body.id, details: { eccentricity: elements.eccentricity } },
          ),
        );
      }
      return;
    }

    if (isFiniteNumber(elements.semiMajorAxis) && elements.semiMajorAxis > MAX_SEMIMAJOR_AXIS) {
      issues.push(
        makeIssue(
          ISSUE_CODES.ORBIT_SEMIMAJOR_EXTREME,
          'warning',
          `Semi-major axis for '${body.id}' exceeds ${MAX_SEMIMAJOR_AXIS} m.`,
          root,
          { bodyId: body.id, details: { semiMajorAxis: elements.semiMajorAxis } },
        ),
      );
    }

    const surfaceLimit = parent.physical.radius + body.physical.radius;
    if (isFiniteNumber(elements.periapsis) && elements.periapsis <= surfaceLimit) {
      issues.push(
        makeIssue(
          ISSUE_CODES.ORBIT_INTERSECTS_PARENT,
          'warning',
          `Bound orbit for '${body.id}' intersects the surface of '${parent.id}'.`,
          root,
          {
            bodyId: body.id,
            details: { periapsis: elements.periapsis, surfaceLimit, parentId: parent.id },
            repair: setNullRepair(
              bodyPath(index, 'parentId'),
              'Detach the body so the state is not interpreted as a bound orbit.',
            ),
          },
        ),
      );
    }
  });
  return issues;
}
