import { Plug } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import type { MarketplaceConnection, MarketplaceId } from '@gamestock/domain';

const LABELS: Record<MarketplaceConnection, { label: string; tone: BadgeTone }> = {
  connected: { label: 'Подключено', tone: 'pos' },
  demo: { label: 'Ограниченный доступ', tone: 'warn' },
  not_connected: { label: 'Не подключено', tone: 'muted' },
};

export function ConnectionStatus({
  id,
  connection,
}: {
  id: MarketplaceId;
  connection: MarketplaceConnection;
}) {
  const status = LABELS[connection];
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-panel px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[11.5px] text-ink-4">
        <Plug size={12} />
        Интеграции
      </span>
      <span className="flex items-center gap-2">
        <MarketplaceBadge id={id} />
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </span>
      <span className="ml-auto text-[11.5px] text-ink-4">
        {connection === 'connected'
          ? 'Публикация и удаление выполняются через API Eldorado.'
          : 'Добавьте ключи Eldorado в настройках API, чтобы управлять объявлениями.'}
      </span>
    </div>
  );
}
