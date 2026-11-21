import type { Universe } from '../types/celestial';
import { validateUniverseShape } from '../storage/schema';
import { asRecord, isRecord } from './guards';
import { makeIssue } from './issues';
import { validateUniverseInput } from './pipeline';
import { createReport } from './report';
import { checkSchemaVersion } from './schemaVersion';
import { ISSUE_CODES, resolveOptions } from './types';
import type { ValidationIssue, ValidationOptions, ValidationReport } from './types';

/** Defensive parsing for user-supplied universe JSON. */

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_INSPECTED_NODES = 100_000;
const MAX_TREE_ISSUES = 20;

export interface ImportInspection {
  universe: Universe | null;
  report: ValidationReport;
}

function scanTree(root: unknown, maxDepth: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new WeakSet<object>();
  const stack: Array<{ value: unknown; path: string; depth: number }> = [
    { value: root, path: '', depth: 0 },
  ];
  let nodes = 0;
  while (stack.length > 0 && issues.length < MAX_TREE_ISSUES) {
    const entry = stack.pop()!;
    if (!isRecord(entry.value) && !Array.isArray(entry.value)) continue;
    const object = entry.value as object;
    if (seen.has(object)) continue;
    seen.add(object);
    nodes += 1;
    if (nodes > MAX_INSPECTED_NODES) break;
    if (entry.depth > maxDepth) {
      issues.push(
        makeIssue(
          ISSUE_CODES.IMPORT_TOO_DEEP,
          'error',
          `Object nesting exceeds ${maxDepth} levels.`,
          entry.path || 'root',
        ),
      );
      continue;
    }
    for (const key of Object.keys(entry.value as Record<string, unknown>)) {
      if (UNSAFE_KEYS.has(key)) {
        issues.push(
          makeIssue(
            ISSUE_CODES.IMPORT_UNSAFE_KEY,
            'error',
            `Unsafe key '${key}' is not allowed in imported data.`,
            entry.path ? `${entry.path}.${key}` : key,
          ),
        );
        continue;
      }
      const child = (entry.value as Record<string, unknown>)[key];
      if (child !== null && typeof child === 'object') {
        stack.push({
          value: child,
          path: entry.path ? `${entry.path}.${key}` : key,
          depth: entry.depth + 1,
        });
      }
    }
  }
  return issues;
}

export function inspectImportValue(value: unknown, options?: ValidationOptions): ImportInspection {
  const resolved = resolveOptions(options);
  const issues: ValidationIssue[] = checkSchemaVersion(value, resolved.expectedSchemaVersion);

  if (!isRecord(value)) {
    issues.push(makeIssue(ISSUE_CODES.IMPORT_NOT_OBJECT, 'error', 'Import must be a JSON object.', 'root'));
    return { universe: null, report: createReport(issues) };
  }
  issues.push(...scanTree(value, resolved.maxImportDepth));
  if (value.kind !== 'universe') {
    issues.push(
      makeIssue(
        ISSUE_CODES.UNIVERSE_KIND_MISMATCH,
        'error',
        'This file does not contain a universe.',
        'kind',
        { details: { kind: String(value.kind) } },
      ),
    );
  }

  const data = asRecord(value.data);
  if (value.data === undefined || value.data === null || data === null) {
    issues.push(
      makeIssue(ISSUE_CODES.IMPORT_MISSING_DATA, 'error', 'Import envelope has no universe data object.', 'data'),
    );
    return { universe: null, report: createReport(issues) };
  }

  const bodies = data.bodies;
  if (Array.isArray(bodies) && bodies.length > resolved.maxBodies) {
    issues.push(
      makeIssue(
        ISSUE_CODES.IMPORT_TOO_MANY_BODIES,
        'error',
        `Import contains ${bodies.length} bodies; the limit is ${resolved.maxBodies}.`,
        'data.bodies',
        { details: { count: bodies.length, limit: resolved.maxBodies } },
      ),
    );
  }
  if (!validateUniverseShape(value.data)) {
    issues.push(
      makeIssue(
        ISSUE_CODES.IMPORT_SHAPE_INVALID,
        'error',
        'Imported universe does not match the required shape.',
        'data',
      ),
    );
  }
  issues.push(
    ...validateUniverseInput(value.data, resolved).issues.map((issue) => ({
      ...issue,
      path: `data.${issue.path}`,
    })),
  );

  const report = createReport(issues);
  const universe = report.valid ? (value.data as Universe) : null;
  return { universe, report };
}

export function inspectImportText(text: string, options?: ValidationOptions): ImportInspection {
  const resolved = resolveOptions(options);
  if (text.length > resolved.maxImportBytes) {
    return {
      universe: null,
      report: createReport([
        makeIssue(
          ISSUE_CODES.IMPORT_TOO_LARGE,
          'error',
          'Import text exceeds the allowed size.',
          'root',
          { details: { length: text.length, limit: resolved.maxImportBytes } },
        ),
      ]),
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      universe: null,
      report: createReport([
        makeIssue(ISSUE_CODES.IMPORT_MALFORMED_JSON, 'error', 'The file is not valid JSON.', 'root'),
      ]),
    };
  }
  return inspectImportValue(parsed, resolved);
}
