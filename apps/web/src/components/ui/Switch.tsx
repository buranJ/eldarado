import { cn } from '@/utils/cn';

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-4 w-7 shrink-0 rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        checked ? 'border-accent bg-accent' : 'border-line-3 bg-panel-3',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-2.5 rounded-full transition-transform',
          checked ? 'translate-x-3 bg-[#0b1024]' : 'translate-x-0.5 bg-ink-3',
        )}
      />
    </button>
  );
}
