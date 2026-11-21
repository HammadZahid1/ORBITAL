import { useId } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  onClear?: () => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  label = 'Search',
  placeholder,
  onClear,
  disabled = false,
  id,
  className = '',
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const clearLabel = `Clear ${label.toLowerCase()}`;

  return (
    <div role="search" aria-label={label} className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative flex items-center">
        <Search
          aria-hidden="true"
          size={13}
          className="pointer-events-none absolute left-2.5 text-(--faint)"
        />
        <input
          id={inputId}
          type="search"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full rounded-[3px] border border-(--line) bg-(--panel-raised) pl-8 pr-8 text-[11px] text-(--ink) outline-none placeholder:text-(--faint) focus:border-(--accent) focus-visible:ring-1 focus-visible:ring-(--accent)"
        />
        {onClear && value.length > 0 && !disabled && (
          <button
            type="button"
            aria-label={clearLabel}
            title={clearLabel}
            onClick={onClear}
            className="absolute right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-[2px] text-(--faint) transition-colors hover:text-(--ink) focus-visible:ring-1 focus-visible:ring-(--accent)"
          >
            <X aria-hidden="true" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
