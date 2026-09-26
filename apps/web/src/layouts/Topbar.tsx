import { useEffect, useRef } from 'react';
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
  const wasRunning = useRef(false);

  const lastRun = sync.status?.lastRun ?? null;
  const busy = sync.triggering || (sync.status?.running ?? false);
  const offline = sync.error !== null;
  const autoSyncEnabled = sync.status?.autoSyncEnabled ?? false;
  const nextRunIn = sync.status?.nextRunAt
    ? Math.max(0, (new Date(sync.status.nextRunAt).getTime() - now) / 3_600_000)
    : null;

  useEffect(() => {
    if (!sync.status) return;
    if (wasRunning.current && !sync.status.running) {
      notifyDataChanged();
      const completed = sync.status.lastRun;
      if (completed?.status === 'ok') {
        toast.push({
          tone: 'success',
          title: 'Сбор завершён',
          description:
            `Увидено ${formatNumber(completed.seen)} · новых ${formatNumber(completed.created)} · ` +
            `прошло фильтр ${formatNumber(completed.passed)} · удалено ${formatNumber(completed.disappeared)}`,
        });
      } else if (completed?.status === 'failed') {
        toast.push({
          tone: 'error',
          title: 'Сбор не удался',
          description: completed.error ?? 'Неизвестная ошибка сбора',
        });
      }
    }
    wasRunning.current = sync.status.running;
  }, [notifyDataChanged, sync.status, toast]);

  const onRefresh = async () => {
    if (!canCollect) return;
    const result = await sync.run(gameId);
    if (result.ok) {
      toast.push({
        tone: 'info',
        title: 'Сбор запущен',
        description: 'Можно продолжать работу — результат появится после завершения.',
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
    <header className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-line bg-panel px-3 md:gap-6 md:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        <span className="hidden h-3.5 w-px bg-line-2 sm:block" />
        <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-2 sm:flex">
          <span className="flex size-4 items-center justify-center rounded-sm border border-line-2 bg-panel-2 text-[8px] font-bold text-ink-3">
            {game.monogram}
          </span>
          {game.name}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 xl:gap-5">
        <div className="hidden items-center gap-2 lg:flex">
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

        <span className="hidden h-3.5 w-px bg-line-2 lg:block" />

        <div className="hidden items-center gap-4 text-[12px] xl:flex">
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
          title={canCollect ? undefined : 'Сбор FunPay недоступен для этой игры'}
          className={busy ? '[&>svg]:animate-spin' : undefined}
        >
          Собрать сейчас
        </Button>
      </div>
    </header>
  );
}
