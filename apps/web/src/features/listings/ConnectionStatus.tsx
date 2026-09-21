import { Plug } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { getMarketplace } from '@/config/marketplaces';
import type { MarketplaceConnection, MarketplaceId } from '@gamestock/domain';

const LABELS: Record<MarketplaceConnection, { label: string; tone: BadgeTone }> = {
  connected: { label: 'Подключено', tone: 'pos' },
  demo: { label: 'Demo mode', tone: 'warn' },
  not_connected: { label: 'Не подключено', tone: 'muted' },
};

export function ConnectionStatus({ ids }: { ids: MarketplaceId[] }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-panel px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[11.5px] text-ink-4">
        <Plug size={12} />
        Интеграции
      </span>
      {ids.map((id) => {
        const marketplace = getMarketplace(id);
        const status = LABELS[marketplace.connection];
        return (
          <span key={id} className="flex items-center gap-2">
            <MarketplaceBadge id={id} />
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          </span>
        );
      })}
      <span className="ml-auto text-[11.5px] text-ink-4">
        Публикация выполняется в демо-режиме — реальные объявления не создаются.
      </span>
    </div>
  );
}
