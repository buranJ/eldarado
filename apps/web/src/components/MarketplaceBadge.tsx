import { getMarketplace } from '@/config/marketplaces';
import type { MarketplaceId } from '@gamestock/domain';
import { cn } from '@/utils/cn';

const TONE_CLASSES: Record<string, string> = {
  accent: 'bg-[#161b33] text-[#93a8ff] border-[#2b3566]',
  violet: 'bg-[#221934] text-[#b58cf7] border-[#3c2b58]',
  info: 'bg-[#122234] text-[#58a6ff] border-[#1f3c5c]',
  neutral: 'bg-panel-3 text-ink-2 border-line-2',
};

/** Renders any marketplace generically — no FunPay/Eldorado special-casing. */
export function MarketplaceBadge({
  id,
  showName = true,
  className,
}: {
  id: MarketplaceId;
  showName?: boolean;
  className?: string;
}) {
  const marketplace = getMarketplace(id);
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex h-[18px] min-w-[22px] items-center justify-center rounded border px-1 text-[9.5px] font-bold tracking-[0.02em]',
          TONE_CLASSES[marketplace.tone],
        )}
      >
        {marketplace.monogram}
      </span>
      {showName ? <span className="text-[12px] text-ink-2">{marketplace.name}</span> : null}
    </span>
  );
}
