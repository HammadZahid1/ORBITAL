import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-(--accent) text-[#040a12] hover:brightness-110 font-semibold border-transparent',
  secondary: 'bg-(--panel-raised) text-(--ink) border-(--line) hover:border-(--accent)',
  ghost: 'bg-transparent text-(--muted) border-transparent hover:text-(--ink) hover:bg-white/5',
  danger: 'bg-transparent text-(--danger) border-(--danger)/40 hover:bg-(--danger)/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[11px] gap-1.5',
  md: 'h-9 px-3.5 text-xs gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  icon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[3px] border transition-colors duration-150 ${variants[variant]} ${sizes[size]} ${active ? 'ring-1 ring-(--accent) text-(--ink)' : ''} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
