import type { ReactNode } from 'react';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  icon?: ReactNode;
  className?: string;
}

const trendTones = {
  up: 'text-(--success)',
  down: 'text-(--danger)',
  flat: 'text-(--faint)',
};

const trendArrows = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function MetricCard({
  label,
  value,
  unit,
  detail,
  trend,
  icon,
  className = '',
}: MetricCardProps) {
  return (
    <section
      aria-label={label}
      className={`orb-panel-raised flex min-w-0 flex-col gap-1.5 rounded-[3px] px-3 py-2.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="orb-label truncate">{label}</span>
        {icon && (
          <span aria-hidden="true" className="shrink-0 text-(--accent)">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="orb-mono truncate text-[18px] leading-none text-(--ink)">{value}</span>
        {unit && <span className="shrink-0 text-[10px] text-(--faint)">{unit}</span>}
      </div>
      {(detail || trend) && (
        <div className="flex min-w-0 items-center gap-2 text-[10px]">
          {trend && (
            <span className={`shrink-0 orb-mono ${trendTones[trend.direction]}`}>
              <span aria-hidden="true">{trendArrows[trend.direction]} </span>
              {trend.label}
            </span>
          )}
          {detail && <span className="truncate text-(--faint)">{detail}</span>}
        </div>
      )}
    </section>
  );
}
