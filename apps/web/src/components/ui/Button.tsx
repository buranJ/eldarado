import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'default' | 'ghost' | 'subtle' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-[#0b1024] hover:bg-[#8099ff] border border-transparent font-medium shadow-panel',
  default:
    'bg-panel-3 text-ink border border-line-2 hover:bg-panel-4 hover:border-line-3',
  ghost: 'text-ink-2 hover:text-ink hover:bg-panel-3 border border-transparent',
  subtle: 'bg-panel-2 text-ink-2 hover:text-ink border border-line hover:border-line-2',
  danger:
    'bg-transparent text-neg border border-[#4a2326] hover:bg-[#2a1618] hover:border-[#632f33]',
  success:
    'bg-transparent text-pos border border-[#1f4327] hover:bg-[#14251a] hover:border-[#2c5c37]',
};

const SIZES: Record<Size, string> = {
  xs: 'h-6 px-2 text-[11px] gap-1 rounded',
  sm: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
};

const ICON_SIZE: Record<Size, number> = { xs: 12, sm: 13, md: 14 };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'sm',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-colors duration-100',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {Icon ? <Icon size={ICON_SIZE[size]} strokeWidth={2} /> : null}
      {children}
      {IconRight ? <IconRight size={ICON_SIZE[size]} strokeWidth={2} /> : null}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  size = 'sm',
  variant = 'ghost',
  className,
  ...rest
}: Omit<ButtonProps, 'children' | 'iconRight'> & { icon: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center transition-colors duration-100 rounded-md',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        size === 'xs' ? 'size-6' : size === 'sm' ? 'size-7' : 'size-8',
        className,
      )}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={2} />
    </button>
  );
}
