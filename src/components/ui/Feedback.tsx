import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'border-(--line) text-(--muted)',
    accent: 'border-(--accent)/40 text-(--accent) bg-(--accent)/8',
    success: 'border-(--success)/40 text-(--success) bg-(--success)/8',
    warning: 'border-(--warn)/40 text-(--warn) bg-(--warn)/8',
    danger: 'border-(--danger)/40 text-(--danger) bg-(--danger)/8',
  };
  return (
    <span className={`inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Meter({ value, max = 1, tone = 'accent' }: { value: number; max?: number; tone?: string }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="h-[3px] w-full overflow-hidden rounded bg-(--line)">
      <div
        className="h-full rounded transition-[width] duration-200"
        style={{ width: `${ratio * 100}%`, background: `var(--${tone})` }}
      />
    </div>
  );
}

export function EmptyState({ title, detail, icon }: { title: string; detail?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <div className="mb-3 text-(--faint)">{icon}</div>}
      <div className="text-[12px] font-medium text-(--ink)">{title}</div>
      {detail && <div className="mt-1 max-w-[240px] text-[10px] leading-relaxed text-(--faint)">{detail}</div>}
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  width = 'max-w-lg',
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`orb-panel-raised orb-enter w-full ${width} overflow-hidden rounded-[4px] shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-(--line) px-4 py-3">
          <h2 className="text-[13px] font-semibold tracking-wide">{title}</h2>
          <IconButton label="Close dialog" icon={<X size={15} />} onClick={onClose} />
        </div>
        <div className="orb-scroll max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-(--line) px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-(--line) bg-(--panel-raised) px-1.5 py-0.5 text-[9px] orb-mono text-(--muted)">
      {children}
    </kbd>
  );
}
