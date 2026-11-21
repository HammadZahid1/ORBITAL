export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex rounded-[3px] border border-(--line) bg-(--panel-raised) p-0.5 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`min-w-0 flex-1 rounded-[2px] px-2.5 py-1 text-[10px] transition-colors focus-visible:ring-1 focus-visible:ring-(--accent) ${
              selected ? 'bg-(--accent)/15 text-(--accent)' : 'text-(--muted) hover:text-(--ink)'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
