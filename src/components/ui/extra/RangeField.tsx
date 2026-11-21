import { useId } from 'react';

export interface RangeFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function RangeField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  display,
  hint,
  disabled = false,
  id,
  className = '',
}: RangeFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`py-1.5 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-[11px] text-(--muted)">
          {label}
        </label>
        <span className="orb-mono text-[10px] text-(--accent)" aria-hidden="true">
          {display ?? value}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        className="w-full focus-visible:ring-1 focus-visible:ring-(--accent)"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={display}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-[10px] leading-relaxed text-(--faint)">
          {hint}
        </p>
      )}
    </div>
  );
}
