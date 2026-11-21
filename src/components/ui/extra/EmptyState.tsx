import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <div aria-hidden="true" className="mb-3 text-(--faint)">
          {icon}
        </div>
      )}
      <p className="text-[12px] font-medium text-(--ink)">{title}</p>
      {description && (
        <p className="mt-1 max-w-[260px] text-[10px] leading-relaxed text-(--faint)">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
