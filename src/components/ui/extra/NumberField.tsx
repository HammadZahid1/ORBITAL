import { useId } from 'react';

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
  disabled = false,
  id,
  className = '',
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`py-1.5 ${className}`}>
      <label htmlFor={inputId} className="mb-1.5 block text-[11px] text-(--muted)">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          className="orb-number-input h-8 min-w-0 flex-1 rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 text-[11px] orb-mono text-(--ink) outline-none focus:border-(--accent) focus-visible:ring-1 focus-visible:ring-(--accent)"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => {
            const parsed = event.target.valueAsNumber;
            if (!Number.isNaN(parsed)) onChange(parsed);
          }}
        />
        {suffix && (
          <span aria-hidden="true" className="shrink-0 text-[10px] text-(--faint)">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[10px] leading-relaxed text-(--faint)">
          {hint}
        </p>
      )}
    </div>
  );
}
