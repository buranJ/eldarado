import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { NAV_ITEMS } from '@/config/navigation';
import { getGame } from '@/config/games';
import { useAppState } from '@/app/providers/app-state-context';
import { useToast } from '@/app/providers/toast-context';
import { useSync } from '@/hooks/useSync';
import { useNow } from '@/hooks/useNow';
import { formatDuration, formatTime, isToday } from '@/utils/date';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

const useSectionTitle = (): string => {
  const { pathname } = useLocation();
  const match = NAV_ITEMS.filter((item) => item.to !== '/').find((item) =>
    pathname.startsWith(item.to),
  );
  return match?.label ?? 'Обзор';
};

export function Topbar() {
  const title = useSectionTitle();
  const { gameId, notifyDataChanged } = useAppState();
  const game = getGame(gameId);
  const toast = useToast();
  const sync = useSync(gameId);
  const now = useNow();
  const canCollect = game.collectionEnabled;

  const lastRun = sync.status?.lastRun ?? null;
  const busy = sync.triggering || (sync.status?.running ?? false);
  const offline = sync.error !== null;
  const autoSyncEnabled = sync.status?.autoSyncEnabled ?? false;
  const nextRunIn = sync.status?.nextRunAt
    ? Math.max(0, (new Date(sync.status.nextRunAt).getTime() - now) / 3_600_000)
    : null;

  const onRefresh = async () => {
    if (!canCollect) return;
    const result = await sync.run(gameId);
    if (result.ok) {
      notifyDataChanged();
      const { seen, created, passed, disappeared } = result.run;
      toast.push({
        tone: 'success',
        title: 'Сбор завершён',
        description:
          `Увидено ${formatNumber(seen)} · новых ${formatNumber(created)} · ` +
          `прошло фильтр ${formatNumber(passed)} · удалено ${formatNumber(disappeared)}`,
      });
    } else {
      toast.push({ tone: 'error', title: 'Сбор не удался', description: result.message });
    }
  };

  const onAutoSyncChange = async (enabled: boolean) => {
    if (!canCollect) return;
    const result = await sync.setAutoSync(enabled);
    if (result.ok) {
      toast.push({
        tone: 'success',
        title: enabled ? 'Автосбор включён' : 'Автосбор выключен',
        description: enabled ? 'Следующий сбор пройдёт автоматически в 08:00.' : undefined,
      });
    } else {
      toast.push({ tone: 'error', title: 'Не удалось изменить автосбор', description: result.message });
    }
  };

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between gap-6 border-b border-line bg-panel px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        <span className="h-3.5 w-px bg-line-2" />
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <span className="flex size-4 items-center justify-center rounded-sm border border-line-2 bg-panel-2 text-[8px] font-bold text-ink-3">
            {game.monogram}
          </span>
          {game.name}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'size-1.5 rounded-full',
              offline
                ? 'bg-neg'
                : !canCollect
                  ? 'bg-ink-4'
                  : busy
                    ? 'animate-pulse bg-info'
                    : 'bg-pos',
            )}
          />
          <span className="text-[12px] text-ink-2">
            {offline
              ? 'Бэкенд недоступен'
              : !canCollect
                ? 'Сбор для игры не настроен'
              : busy
                ? 'Идёт сбор данных…'
                : 'Сканирование: ожидание'}
          </span>
        </div>

        <span className="h-3.5 w-px bg-line-2" />

        <div className="flex items-center gap-4 text-[12px]">
          <span className="text-ink-3">
            Последний сбор:{' '}
            <span className="text-ink-2">
              {lastRun
                ? `${isToday(lastRun.startedAt) ? 'сегодня' : 'ранее'}, ${formatTime(lastRun.startedAt)}`
                : canCollect
                  ? 'не выполнялся'
                  : '—'}
            </span>
          </span>
          <label className="flex items-center gap-2 text-ink-3" title="Ежедневный сбор в 08:00">
            <span>Автосбор</span>
            <Switch
              label="Автоматический ежедневный сбор"
              checked={autoSyncEnabled}
              disabled={!canCollect || sync.updatingAutoSync || offline}
              onChange={onAutoSyncChange}
            />
          </label>
          {canCollect && autoSyncEnabled && nextRunIn !== null ? (
            <span className="text-ink-3">
              Следующий сбор через <span className="text-ink-2">{formatDuration(nextRunIn)}</span>
            </span>
          ) : null}
        </div>

        <Button
          variant="default"
          size="sm"
          icon={RefreshCw}
          onClick={onRefresh}
          disabled={!canCollect || busy}
          title={canCollect ? undefined : 'Парсер для этой игры ещё не подключён'}
          className={busy ? '[&>svg]:animate-spin' : undefined}
        >
          Собрать сейчас
        </Button>
      </div>
    </header>
  );
}
