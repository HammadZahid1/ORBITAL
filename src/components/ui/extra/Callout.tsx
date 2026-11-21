import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger';

export interface CalloutProps {
  title: string;
  children?: ReactNode;
  tone?: CalloutTone;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

const toneClasses: Record<CalloutTone, string> = {
  info: 'border-(--accent)/40 bg-(--accent)/8',
  success: 'border-(--success)/40 bg-(--success)/8',
  warning: 'border-(--warn)/40 bg-(--warn)/8',
  danger: 'border-(--danger)/40 bg-(--danger)/8',
};

export function Callout({
  title,
  children,
  tone = 'info',
  action,
  onDismiss,
  dismissLabel = 'Dismiss notification',
  className = '',
}: CalloutProps) {
  const Icon = icons[tone];
  const role = tone === 'danger' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      aria-label={title}
      className={`flex items-start gap-2.5 rounded-[3px] border px-3 py-2.5 orb-enter ${toneClasses[tone]} ${className}`}
    >
      <Icon aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-(--ink)">{title}</div>
        {children && (
          <div className="mt-1 text-[10px] leading-relaxed text-(--muted)">{children}</div>
        )}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label={dismissLabel}
          title={dismissLabel}
          onClick={onDismiss}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] text-(--muted) transition-colors hover:text-(--ink) focus-visible:ring-1 focus-visible:ring-(--accent)"
        >
          <X aria-hidden="true" size={13} />
        </button>
      )}
    </div>
  );
}
