import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type InfoNoteTone = 'info' | 'warning' | 'success' | 'danger';

export interface InfoNoteProps {
  title: string;
  children?: ReactNode;
  tone?: InfoNoteTone;
  className?: string;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertTriangle,
};

const toneClasses: Record<InfoNoteTone, string> = {
  info: 'border-(--accent)/35 bg-(--accent)/6 text-(--accent)',
  warning: 'border-(--warn)/35 bg-(--warn)/6 text-(--warn)',
  success: 'border-(--success)/35 bg-(--success)/6 text-(--success)',
  danger: 'border-(--danger)/35 bg-(--danger)/6 text-(--danger)',
};

export function InfoNote({ title, children, tone = 'info', className = '' }: InfoNoteProps) {
  const Icon = icons[tone];

  return (
    <aside
      role="note"
      aria-label={title}
      className={`flex gap-2.5 rounded-[3px] border px-3 py-2.5 ${toneClasses[tone]} ${className}`}
    >
      <Icon aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-(--ink)">{title}</div>
        {children && (
          <div className="mt-1 text-[10px] leading-relaxed text-(--muted)">{children}</div>
        )}
      </div>
    </aside>
  );
}
