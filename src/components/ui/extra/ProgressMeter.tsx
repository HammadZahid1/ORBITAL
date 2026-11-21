export type ProgressMeterTone = 'accent' | 'success' | 'warning' | 'danger';

export interface ProgressMeterProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  valueText?: string;
  tone?: ProgressMeterTone;
  showValue?: boolean;
  className?: string;
}

const toneClasses: Record<ProgressMeterTone, string> = {
  accent: 'bg-(--accent)',
  success: 'bg-(--success)',
  warning: 'bg-(--warn)',
  danger: 'bg-(--danger)',
};

export function ProgressMeter({
  label,
  value,
  min = 0,
  max = 100,
  valueText,
  tone = 'accent',
  showValue = true,
  className = '',
}: ProgressMeterProps) {
  const span = max - min;
  const clamped = Math.max(min, Math.min(max, value));
  const ratio = span > 0 ? Math.max(0, Math.min(1, (clamped - min) / span)) : 0;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-(--muted)">{label}</span>
        {showValue && (
          <span className="orb-mono shrink-0 text-[10px] text-(--faint)" aria-hidden="true">
            {valueText ?? `${Math.round(ratio * 100)}%`}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className="h-[4px] w-full overflow-hidden rounded-full bg-(--line)"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${toneClasses[tone]}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
