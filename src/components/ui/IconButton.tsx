import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function IconButton({ label, icon, active, size = 'md', className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-transparent text-(--muted) transition-colors hover:text-(--ink) hover:bg-white/6 hover:border-(--line) ${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} ${active ? 'bg-(--accent)/12 text-(--accent) border-(--accent)/35' : ''} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
