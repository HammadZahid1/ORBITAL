import { SCHEMA_VERSION } from '../storage/schema';
import { asRecord, isFiniteNumber } from './guards';
import { makeIssue } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';

/** Envelope schema-version checks shared by import and local-storage paths. */

export function isSupportedSchemaVersion(value: unknown, expected = SCHEMA_VERSION): boolean {
  return isFiniteNumber(value) && Number.isInteger(value) && value === expected;
}

export function checkSchemaVersion(value: unknown, expected = SCHEMA_VERSION): ValidationIssue[] {
  const envelope = asRecord(value);
  if (envelope === null || !('version' in envelope)) {
    return [
      makeIssue(
        ISSUE_CODES.SCHEMA_VERSION_MISSING,
        'error',
        'The stored object is missing a schema version.',
        'version',
      ),
    ];
  }
  const actual = envelope.version;
  if (isSupportedSchemaVersion(actual, expected)) return [];
  return [
    makeIssue(
      ISSUE_CODES.SCHEMA_VERSION_UNSUPPORTED,
      'error',
      `Unsupported schema version ${String(actual)}; expected ${expected}.`,
      'version',
      { details: { actual: typeof actual === 'number' ? actual : String(actual), expected } },
    ),
  ];
}
