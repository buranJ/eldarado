import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { priceInputId } from './price-input';
import { currencySymbol } from '@/utils/money';
import type { Money } from '@gamestock/domain';
import { cn } from '@/utils/cn';

/**
 * Manual resale price override. The calculated recommendation stays visible so the
 * operator always sees what they are deviating from.
 */
export function PriceEditor({
  inventoryItemId,
  recommended,
  manual,
  onCommit,
  disabled = false,
}: {
  inventoryItemId: string;
  recommended: Money;
  manual: Money | null;
  onCommit: (amount: number | null) => void;
  disabled?: boolean;
}) {
  const effective = manual ?? recommended;
  const [draft, setDraft] = useState<{ value: string; committed: number } | null>(null);
  const [focused, setFocused] = useState(false);

  /* The input mirrors the stored price unless the operator is editing it. */
  const value = draft && draft.committed === effective.amount ? draft.value : String(effective.amount);
  const setValue = (next: string) => setDraft({ value: next, committed: effective.amount });

  const commit = () => {
    const parsed = Number(value);
    setDraft(null);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed === effective.amount) return;
    onCommit(parsed === recommended.amount ? null : parsed);
  };

  const overridden = manual !== null && manual.amount !== recommended.amount;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {overridden ? (
        <button
          type="button"
          title="Вернуть рекомендованную цену"
          onClick={() => onCommit(null)}
          disabled={disabled}
          className="text-ink-4 transition-colors hover:text-ink-2 disabled:opacity-40"
        >
          <RotateCcw size={11} />
        </button>
      ) : null}
      <div
        className={cn(
          'flex h-6 w-[92px] items-center rounded-md border bg-panel-2 px-1.5 transition-colors',
          disabled
            ? 'border-line opacity-50'
            : focused
              ? 'border-accent'
              : overridden
                ? 'border-[#4d3b1a] hover:border-line-3'
                : 'border-line-2 hover:border-line-3',
        )}
      >
        <span className={cn('text-[11.5px]', overridden ? 'text-warn' : 'text-ink-4')}>
          {currencySymbol(effective.currency)}
        </span>
        <input
          id={priceInputId(inventoryItemId)}
          value={value}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => setValue(event.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          className={cn(
            'num w-full bg-transparent px-1 text-right text-[12.5px] outline-none',
            overridden ? 'text-warn' : 'text-ink',
          )}
        />
      </div>
    </div>
  );
}
