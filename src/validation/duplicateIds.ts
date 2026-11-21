import { bodyPath, makeIssue, setStringRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { Universe } from '../types/celestial';

/** Body ids must be unique; duplicate names are convenient but only a warning. */

export function checkDuplicateIds(universe: Universe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const firstById = new Map<string, number>();
  const firstByName = new Map<string, number>();

  universe.bodies.forEach((body, index) => {
    if (body.id !== '') {
      const first = firstById.get(body.id);
      if (first !== undefined) {
        const replacement = `${body.id}-${index + 1}`;
        issues.push(
          makeIssue(
            ISSUE_CODES.DUPLICATE_ID,
            'error',
            `Duplicate body id '${body.id}' (first used at ${bodyPath(first)}).`,
            bodyPath(index, 'id'),
            {
              bodyId: body.id,
              details: { firstIndex: first, duplicateIndex: index },
              repair: setStringRepair(
                bodyPath(index, 'id'),
                replacement,
                `Rename the duplicate id to '${replacement}'.`,
              ),
            },
          ),
        );
      } else {
        firstById.set(body.id, index);
      }
    }

    const name = body.name.trim();
    if (name !== '') {
      const first = firstByName.get(name);
      if (first !== undefined) {
        issues.push(
          makeIssue(
            ISSUE_CODES.DUPLICATE_NAME,
            'warning',
            `Body name '${name}' is also used at ${bodyPath(first)}.`,
            bodyPath(index, 'name'),
            { bodyId: body.id, details: { firstIndex: first } },
          ),
        );
      } else {
        firstByName.set(name, index);
      }
    }
  });
  return issues;
}
