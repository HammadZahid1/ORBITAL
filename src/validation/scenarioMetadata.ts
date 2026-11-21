import { asRecord, isFiniteNumber } from './guards';
import { makeIssue } from './issues';
import { validateUniverseInput } from './pipeline';
import { createReport } from './report';
import { ISSUE_CODES } from './types';
import type { ValidationIssue, ValidationReport } from './types';

/** Metadata and camera validation for bundled or user-authored scenarios. */

const CATEGORIES = new Set(['solar', 'orbital', 'stellar', 'experiments', 'extreme', 'custom']);

function requireText(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): void {
  const value = record[key];
  if (typeof value !== 'string') {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', `'${key}' must be a string.`, path));
  } else if (value.trim() === '') {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', `'${key}' must not be empty.`, path));
  }
}

function requireVector3(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  positive = false,
): void {
  if (!Array.isArray(value) || value.length !== 3) {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_CAMERA, 'error', `'${path}' must be a 3-number tuple.`, path));
    return;
  }
  value.forEach((component, index) => {
    if (!isFiniteNumber(component)) {
      issues.push(
        makeIssue(
          ISSUE_CODES.SCENARIO_CAMERA,
          'error',
          `${path}[${index}] must be finite.`,
          `${path}[${index}]`,
        ),
      );
    }
  });
  if (positive && isFiniteNumber(value[0]) && isFiniteNumber(value[1]) && isFiniteNumber(value[2]) && Math.hypot(value[0], value[1], value[2]) === 0) {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_CAMERA, 'warning', `'${path}' is a zero vector.`, path));
  }
}

export function validateScenarioMetadata(value: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];
  const scenario = asRecord(value);
  if (scenario === null) {
    return createReport([
      makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', 'Scenario must be an object.', 'scenario'),
    ]);
  }

  for (const key of ['id', 'name', 'description', 'educationalNotes'] as const) {
    requireText(scenario, key, `scenario.${key}`, issues);
  }
  if (typeof scenario.category !== 'string' || !CATEGORIES.has(scenario.category)) {
    issues.push(
      makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', 'Scenario has an unsupported category.', 'scenario.category', {
        details: { category: String(scenario.category) },
      }),
    );
  }
  if (!Array.isArray(scenario.tags) || !scenario.tags.every((tag) => typeof tag === 'string')) {
    issues.push(
      makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', 'Scenario tags must be strings.', 'scenario.tags'),
    );
  }

  if (!('universe' in scenario)) {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', 'Scenario is missing its universe.', 'scenario.universe'));
  } else {
    issues.push(...validateUniverseInput(scenario.universe).issues.map((issue) => ({
      ...issue,
      path: `scenario.universe.${issue.path}`,
    })));
  }

  const camera = asRecord(scenario.camera);
  if (camera === null) {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_CAMERA, 'error', 'Scenario camera must be an object.', 'scenario.camera'));
  } else {
    requireVector3(camera.position, 'scenario.camera.position', issues, true);
    requireVector3(camera.target, 'scenario.camera.target', issues);
    if (!isFiniteNumber(camera.suggestedDistance) || camera.suggestedDistance <= 0) {
      issues.push(
        makeIssue(
          ISSUE_CODES.SCENARIO_CAMERA,
          'error',
          'Camera suggestedDistance must be positive and finite.',
          'scenario.camera.suggestedDistance',
        ),
      );
    }
  }

  const layers = asRecord(scenario.layers);
  if (layers === null) {
    issues.push(makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', 'Scenario layers must be an object.', 'scenario.layers'));
  } else {
    for (const [key, value] of Object.entries(layers)) {
      if (typeof value !== 'boolean') {
        issues.push(
          makeIssue(ISSUE_CODES.SCENARIO_FIELD, 'error', `Layer '${key}' must be a boolean.`, `scenario.layers.${key}`),
        );
      }
    }
  }
  return createReport(issues);
}
