import type { Vec3 } from '../types/vector';
import type { Severity } from './severity';
import type { IssueCode, IssueDetailValue, RepairAction, ValidationIssue } from './types';

/** Small constructors so each check can focus on its own rules. */

export interface IssueExtras {
  bodyId?: string;
  repair?: RepairAction;
  details?: Readonly<Record<string, IssueDetailValue>>;
}

export function makeIssue(
  code: IssueCode,
  severity: Severity,
  message: string,
  path: string,
  extras: IssueExtras = {},
): ValidationIssue {
  return { code, severity, message, path, ...extras };
}

export function bodyPath(index: number, suffix = ''): string {
  return suffix ? `bodies[${index}].${suffix}` : `bodies[${index}]`;
}

export function setNumberRepair(path: string, value: number, description: string): RepairAction {
  return { kind: 'set-number', path, value, description };
}

export function setVectorRepair(path: string, value: Vec3, description: string): RepairAction {
  return { kind: 'set-vector', path, value, description };
}

export function setStringRepair(path: string, value: string, description: string): RepairAction {
  return { kind: 'set-string', path, value, description };
}

export function setBooleanRepair(path: string, value: boolean, description: string): RepairAction {
  return { kind: 'set-boolean', path, value, description };
}

export function setNullRepair(path: string, description: string): RepairAction {
  return { kind: 'set-null', path, description };
}

export function removeBodyRepair(bodyId: string, description: string): RepairAction {
  return { kind: 'remove-body', bodyId, description };
}
