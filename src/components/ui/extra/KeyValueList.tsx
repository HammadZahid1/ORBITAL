import type { ReactNode } from 'react';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export interface KeyValueListProps {
  items: readonly KeyValueItem[];
  label?: string;
  dense?: boolean;
  className?: string;
}

export function KeyValueList({ items, label, dense = false, className = '' }: KeyValueListProps) {
  return (
    <dl
      role="list"
      aria-label={label}
      className={`min-w-0 ${dense ? 'space-y-0.5' : 'space-y-1'} ${className}`}
    >
      {items.map((item) => (
        <div
          role="listitem"
          key={item.label}
          className="flex items-baseline justify-between gap-3 border-b border-(--line-soft) py-1 last:border-b-0"
        >
          <dt className="shrink-0 text-[11px] text-(--muted)">{item.label}</dt>
          <dd
            className={`min-w-0 truncate text-right text-[11px] text-(--ink) ${item.mono ? 'orb-mono' : ''}`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
