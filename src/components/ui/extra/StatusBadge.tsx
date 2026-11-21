import type { ReactNode } from 'react';

export type StatusBadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
  dot?: boolean;
  className?: string;
}

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: 'border-(--line) text-(--muted)',
  accent: 'border-(--accent)/40 bg-(--accent)/8 text-(--accent)',
  success: 'border-(--success)/40 bg-(--success)/8 text-(--success)',
  warning: 'border-(--warn)/40 bg-(--warn)/8 text-(--warn)',
  danger: 'border-(--danger)/40 bg-(--danger)/8 text-(--danger)',
};

const dotClasses: Record<StatusBadgeTone, string> = {
  neutral: 'bg-(--faint)',
  accent: 'bg-(--accent)',
  success: 'bg-(--success)',
  warning: 'bg-(--warn)',
  danger: 'bg-(--danger)',
};

export function StatusBadge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${toneClasses[tone]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClasses[tone]}`}
        />
      )}
      {children}
    </span>
  );
}
