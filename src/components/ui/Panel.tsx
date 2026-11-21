import type { ReactNode } from 'react';

export function Panel({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`orb-panel rounded-[3px] ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-(--line) px-3 py-2.5">
      {icon && <span className="text-(--accent)">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold tracking-wide text-(--ink)">{title}</div>
        {subtitle && <div className="truncate text-[10px] text-(--faint)">{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}

export function PanelSection({
  title,
  children,
  actions,
  dense = false,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  dense?: boolean;
}) {
  return (
    <section className={dense ? 'px-3 py-2' : 'px-3 py-3'}>
      <div className="orb-label mb-2.5 flex items-center justify-between">
        <span>{title}</span>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PropertyRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] text-(--muted)">{label}</span>
      <span className={`orb-mono truncate text-[11px] ${accent ? 'text-(--accent)' : 'text-(--ink)'}`}>
        {value}
      </span>
    </div>
  );
}
