import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'block text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3',
        className,
      )}
    >
      {children}
    </span>
  );
}

const baseControl =
  'h-7 w-full rounded-md border border-line-2 bg-panel-2 px-2 text-[12px] text-ink placeholder:text-ink-4 transition-colors hover:border-line-3 focus:border-accent focus:outline-none disabled:opacity-40';

export function TextInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(baseControl, 'num', className)} />;
}

export function SearchInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={13}
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-4"
      />
      <input {...rest} className={cn(baseControl, 'pl-7')} />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function Select({
  options,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <div className={cn('relative', className)}>
      <select
        {...rest}
        className={cn(
          baseControl,
          'cursor-pointer appearance-none pr-6 [&>option]:bg-panel-3 [&>option]:text-ink',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer select-none items-center gap-2 text-[12px] text-ink-2 transition-colors hover:text-ink',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 cursor-pointer appearance-none rounded-[3px] border border-line-3 bg-panel-2 transition-colors checked:border-accent checked:bg-accent checked:after:block checked:after:h-full checked:after:w-full checked:after:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%230b1024%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M3 8.5l3.5 3.5L13 5%22/></svg>')] checked:after:bg-contain"
      />
      {label}
    </label>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
