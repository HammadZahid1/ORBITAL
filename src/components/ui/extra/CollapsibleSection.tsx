import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  description?: string;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  description,
  className = '',
}: CollapsibleSectionProps) {
  const generatedId = useId();
  const buttonId = `${generatedId}-trigger`;
  const panelId = `${generatedId}-panel`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  function toggle() {
    const next = !isOpen;
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <section className={`min-w-0 ${className}`}>
      <h3 className="m-0 text-[11px] font-semibold text-(--ink)">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
          className="flex w-full items-center gap-2 rounded-[3px] px-1 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-(--accent)"
        >
          <ChevronDown
            aria-hidden="true"
            size={13}
            className={`shrink-0 text-(--faint) transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
          <span className="min-w-0 truncate">{title}</span>
        </button>
      </h3>
      {description && <p className="mt-0.5 px-1 text-[10px] text-(--faint)">{description}</p>}
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="pt-2">
        {children}
      </div>
    </section>
  );
}
