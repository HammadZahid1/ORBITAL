import type { ReactNode } from 'react';

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-(--muted)">{label}</span>
        <span className="orb-mono text-[10px] text-(--accent)">{display ?? value}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-[11px] text-(--ink)">{label}</span>
        {hint && <span className="block text-[10px] text-(--faint)">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-[16px] w-[30px] shrink-0 rounded-full border border-(--line) bg-(--panel-raised) transition-colors peer-checked:border-(--accent) peer-checked:bg-(--accent)/25 peer-focus-visible:ring-1 peer-focus-visible:ring-(--accent)">
        <span className="absolute left-[2px] top-[2px] h-[10px] w-[10px] rounded-full bg-(--faint) transition-transform peer-checked:translate-x-[14px] peer-checked:bg-(--accent)" />
      </span>
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block py-1.5">
      {label && <span className="mb-1.5 block text-[11px] text-(--muted)">{label}</span>}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-8 w-full rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 text-[11px] text-(--ink) outline-none focus:border-(--accent)"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1.5 block text-[11px] text-(--muted)">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          aria-label={label}
          type="number"
          className="orb-number-input h-8 min-w-0 flex-1 rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 text-[11px] orb-mono outline-none focus:border-(--accent)"
          value={Number.isFinite(value) ? Number(value.toPrecision(10)) : 0}
          step={step}
          min={min}
          max={max}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
        />
        {suffix && <span className="shrink-0 text-[10px] text-(--faint)">{suffix}</span>}
      </span>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1.5 block text-[11px] text-(--muted)">{label}</span>
      <input
        aria-label={label}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 text-[11px] outline-none focus:border-(--accent)"
      />
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[3px] border border-(--line) p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-[2px] px-2 py-1 text-[10px] transition-colors ${
            value === option.value
              ? 'bg-(--accent)/15 text-(--accent)'
              : 'text-(--muted) hover:text-(--ink)'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 py-1 text-[10px] text-(--ink) opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </span>
  );
}
