import {
  Check,
  DollarSign,
  FileText,
  Pause,
  RadioTower,
  Receipt,
  ShoppingCart,
  Upload,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatRelative } from '@/utils/date';
import type { ActivityEvent, ActivityKind } from '@gamestock/domain';
import { cn } from '@/utils/cn';

const ICONS: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  account_approved: { icon: Check, tone: 'text-pos' },
  account_rejected: { icon: X, tone: 'text-neg' },
  account_purchased: { icon: ShoppingCart, tone: 'text-[#93a8ff]' },
  price_changed: { icon: DollarSign, tone: 'text-warn' },
  listing_prepared: { icon: FileText, tone: 'text-ink-2' },
  listing_published: { icon: Upload, tone: 'text-pos' },
  listing_deleted: { icon: X, tone: 'text-neg' },
  listing_paused: { icon: Pause, tone: 'text-warn' },
  scan_finished: { icon: RadioTower, tone: 'text-info' },
  sale_completed: { icon: Receipt, tone: 'text-[#b58cf7]' },
};

export function ActivityFeed({
  events,
  loading = false,
}: {
  events: ActivityEvent[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-line">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <EmptyState compact title="Действий пока нет" description="Здесь появятся операции команды." />;
  }

  return (
    <ul className="divide-y divide-line">
      {events.map((event) => {
        const config = ICONS[event.kind];
        const Icon = config.icon;
        return (
          <li
            key={event.id}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-panel-2"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel-2">
              <Icon size={12} strokeWidth={2.2} className={cn(config.tone)} />
            </span>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="text-[12.5px] text-ink">{event.title}</span>
              <span className="num text-[12px] text-ink-2">{event.subject}</span>
              {event.meta ? (
                <span className="truncate text-[11.5px] text-ink-4">· {event.meta}</span>
              ) : null}
            </div>
            <span className="shrink-0 text-[11.5px] text-ink-4">{event.actor}</span>
            <span className="w-[92px] shrink-0 text-right text-[11.5px] text-ink-4">
              {formatRelative(event.at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
