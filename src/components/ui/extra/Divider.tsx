export interface DividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ label, orientation = 'horizontal', className = '' }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        className={`mx-1 h-4 w-px shrink-0 bg-(--line) ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div role="separator" aria-label={label} className={`flex items-center gap-2 ${className}`}>
        <span aria-hidden="true" className="h-px flex-1 bg-(--line)" />
        <span aria-hidden="true" className="orb-label shrink-0">
          {label}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-(--line)" />
      </div>
    );
  }

  return <hr className={`orb-divider border-0 ${className}`} />;
}
