import { useId } from 'react';

export interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function ToggleRow({
  label,
  checked,
  onChange,
  description,
  disabled = false,
  id,
  className = '',
}: ToggleRowProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <label
      htmlFor={inputId}
      className={`flex items-center justify-between gap-3 py-1.5 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${className}`}
    >
      <span className="min-w-0">
        <span className="block text-[11px] text-(--ink)">{label}</span>
        {description && (
          <span id={descriptionId} className="block text-[10px] text-(--faint)">
            {description}
          </span>
        )}
      </span>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-[16px] w-[30px] shrink-0 rounded-full border border-(--line) bg-(--panel-raised) transition-colors peer-checked:border-(--accent) peer-checked:bg-(--accent)/25 peer-focus-visible:ring-1 peer-focus-visible:ring-(--accent)"
      >
        <span className="absolute left-[2px] top-[2px] h-[10px] w-[10px] rounded-full bg-(--faint) transition-transform peer-checked:translate-x-[14px] peer-checked:bg-(--accent)" />
      </span>
    </label>
  );
}
