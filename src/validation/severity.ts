/** Severity model shared by every validation check. */

export type Severity = 'error' | 'warning' | 'info';

export interface SeverityCounts {
  error: number;
  warning: number;
  info: number;
}

/** Higher ranks are more serious; used to order and aggregate reports. */
export const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  error: 3,
  warning: 2,
  info: 1,
};

export const ALL_SEVERITIES: readonly Severity[] = ['error', 'warning', 'info'];

export function emptySeverityCounts(): SeverityCounts {
  return { error: 0, warning: 0, info: 0 };
}

export function countSeverities(severities: Iterable<Severity>): SeverityCounts {
  const counts = emptySeverityCounts();
  for (const severity of severities) counts[severity] += 1;
  return counts;
}

export function isMoreSevere(left: Severity, right: Severity): boolean {
  return SEVERITY_RANK[left] > SEVERITY_RANK[right];
}

/** Returns the most serious level in a set, or null when there is none. */
export function worstSeverity(severities: Iterable<Severity>): Severity | null {
  let worst: Severity | null = null;
  for (const severity of severities) {
    if (worst === null || isMoreSevere(severity, worst)) worst = severity;
  }
  return worst;
}
