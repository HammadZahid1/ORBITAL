import { isFiniteNumber } from './guards';
import { bodyPath, makeIssue, setNumberRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Spatial and presentation scale checks. Physical state units are SI. */

const LARGE_EXTENT = 1e24;
const EXTREME_EXTENT = 1e30;
const LARGE_VISUAL_SCALE = 100;
const TINY_VISUAL_SCALE = 1e-3;

export function checkScaleReasonableness(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let maxExtent = 0;
  for (const body of universe.bodies) {
    const { x, y, z } = body.physical.position;
    if (![x, y, z].every(isFiniteNumber)) continue;
    maxExtent = Math.max(maxExtent, Math.hypot(x, y, z));
  }

  if (!isFiniteNumber(maxExtent)) {
    issues.push(
      makeIssue(ISSUE_CODES.SCALE_EXTREME, 'error', 'Position extent is not finite.', 'bodies'),
    );
  } else if (maxExtent > EXTREME_EXTENT) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SCALE_EXTREME,
        'error',
        'Position extent is beyond any sane physical simulation scale.',
        'bodies',
        { details: { maxExtent } },
      ),
    );
  } else if (maxExtent > LARGE_EXTENT) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SCALE_EXTREME,
        'warning',
        'Position extent is extremely large; verify the intended scale.',
        'bodies',
        { details: { maxExtent } },
      ),
    );
  }

  universe.bodies.forEach((body, index) => {
    const scale = body.visual.visualScale;
    if (!isFiniteNumber(scale)) return;
    const path = bodyPath(index, 'visual.visualScale');
    if (scale <= 0) {
      issues.push(
        makeIssue(ISSUE_CODES.VISUAL_SCALE_EXTREME, 'error', 'Visual scale must be positive.', path, {
          bodyId: body.id,
          repair: setNumberRepair(path, 1, 'Reset visual scale to 1.'),
        }),
      );
    } else if (scale > LARGE_VISUAL_SCALE || scale < TINY_VISUAL_SCALE) {
      issues.push(
        makeIssue(
          ISSUE_CODES.VISUAL_SCALE_EXTREME,
          'warning',
          'Visual scale is far outside the usual 0.001–100 range.',
          path,
          { bodyId: body.id, details: { scale } },
        ),
      );
    }
  });
  return issues;
}
