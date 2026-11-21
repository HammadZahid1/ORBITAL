import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  label: string;
  icon: ReactNode;
  pressed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'accent' | 'danger';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const toneClasses = {
  default:
    'border-transparent text-(--muted) hover:border-(--line) hover:bg-white/6 hover:text-(--ink)',
  accent: 'border-(--accent)/35 bg-(--accent)/12 text-(--accent) hover:bg-(--accent)/20',
  danger: 'border-transparent text-(--danger) hover:border-(--danger)/40 hover:bg-(--danger)/10',
};

export function IconButton({
  label,
  icon,
  pressed,
  size = 'md',
  tone = 'default',
  type = 'button',
  title,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border transition-colors focus-visible:ring-1 focus-visible:ring-(--accent) ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
    >
      {icon}
    </button>
  );
}
