import { countSeverities, emptySeverityCounts, SEVERITY_RANK, worstSeverity } from './severity';
import type { ValidationIssue, ValidationReport } from './types';

/** Aggregates issues from any number of checks into one stable report. */

export function sortIssues(issues: readonly ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (bySeverity !== 0) return bySeverity;
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.code.localeCompare(b.code);
  });
}

export function createReport(issues: readonly ValidationIssue[]): ValidationReport {
  const sorted = sortIssues(issues);
  const counts = sorted.length === 0 ? emptySeverityCounts() : countSeverities(sorted.map((issue) => issue.severity));
  const byCode: Record<string, number> = {};
  for (const issue of sorted) byCode[issue.code] = (byCode[issue.code] ?? 0) + 1;
  const level = worstSeverity(sorted.map((issue) => issue.severity)) ?? 'ok';
  return {
    valid: counts.error === 0,
    level,
    issues: sorted,
    counts,
    errors: sorted.filter((issue) => issue.severity === 'error'),
    warnings: sorted.filter((issue) => issue.severity === 'warning'),
    byCode,
  };
}

export function mergeReports(...reports: readonly ValidationReport[]): ValidationReport {
  return createReport(reports.flatMap((report) => report.issues));
}

export function isBlocking(report: ValidationReport): boolean {
  return !report.valid;
}
