import { useId } from 'react';

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectFieldOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  disabled = false,
  id,
  className = '',
}: SelectFieldProps<T>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;

  return (
    <div className={`py-1.5 ${className}`}>
      <label htmlFor={selectId} className="mb-1.5 block text-[11px] text-(--muted)">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-8 w-full rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 text-[11px] text-(--ink) outline-none focus:border-(--accent) focus-visible:ring-1 focus-visible:ring-(--accent)"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="mt-1 text-[10px] leading-relaxed text-(--faint)">
          {hint}
        </p>
      )}
    </div>
  );
}
