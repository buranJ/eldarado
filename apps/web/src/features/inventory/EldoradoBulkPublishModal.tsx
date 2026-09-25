import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Upload,
  XCircle,
} from 'lucide-react';
import { api } from '@/api/client';
import type { EldoradoPublishPreview, InventoryItemDto } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatMoney, toBase } from '@/utils/money';
import { createTemporaryCredentials } from './temporary-credentials';

type EntryStatus = 'checking' | 'ready' | 'publishing' | 'published' | 'error';

interface BulkEntry {
  item: InventoryItemDto;
  preview: EldoradoPublishPreview | null;
  status: EntryStatus;
  error: string | null;
  url: string | null;
}

const statusIcon = (status: EntryStatus) => {
  if (status === 'checking' || status === 'publishing') {
    return <LoaderCircle size={14} className="animate-spin text-accent" />;
  }
  if (status === 'published') return <CheckCircle2 size={14} className="text-pos" />;
  if (status === 'error') return <XCircle size={14} className="text-neg" />;
  return <CheckCircle2 size={14} className="text-ink-3" />;
};

const statusLabel: Record<EntryStatus, string> = {
  checking: 'Проверка',
  ready: 'Готов',
  publishing: 'Публикация',
  published: 'Опубликован',
  error: 'Ошибка',
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function EldoradoBulkPublishModal({
  items,
  onClose,
  onFinished,
}: {
  items: InventoryItemDto[];
  onClose: () => void;
  onFinished: () => void;
}) {
  const [entries, setEntries] = useState<BulkEntry[]>(() =>
    items.map((item) => ({ item, preview: null, status: 'checking', error: null, url: null })),
  );
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [queueTotal, setQueueTotal] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all(
      items.map(async (item): Promise<BulkEntry> => {
        try {
          const preview = await api.eldoradoPreview(item.id);
          if (preview.sourceImageUrls.length === 0) {
            return { item, preview, status: 'error', error: 'Нет сохранённых фотографий', url: null };
          }
          return { item, preview, status: 'ready', error: null, url: null };
        } catch (error) {
          return {
            item,
            preview: null,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            url: null,
          };
        }
      }),
    ).then((next) => {
      if (active) setEntries(next);
    });
    return () => {
      active = false;
    };
  }, [items]);

  const checking = entries.some((entry) => entry.status === 'checking');
  const readyCount = entries.filter((entry) => entry.status === 'ready').length;
  const publishedCount = entries.filter((entry) => entry.status === 'published').length;
  const errorCount = entries.filter((entry) => entry.status === 'error').length;
  const totalValue = useMemo(
    () =>
      entries
        .filter((entry) => (entry.preview?.sourceImageUrls.length ?? 0) > 0)
        .reduce((sum, entry) => {
          const price = entry.item.resale.manualPrice ?? entry.item.resale.recommendedPrice;
          return sum + toBase(price, 'USD').amount;
        }, 0),
    [entries],
  );

  const updateEntry = (id: string, patch: Partial<BulkEntry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.item.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const publishAll = async () => {
    if (running || readyCount === 0) return;
    setRunning(true);
    const queue = entries.filter(
      (entry): entry is BulkEntry & { preview: EldoradoPublishPreview } =>
        entry.status === 'ready' && entry.preview !== null,
    );
    setQueueTotal(queue.length);
    setProcessedCount(0);

    for (const entry of queue) {
      updateEntry(entry.item.id, { status: 'publishing', error: null });
      const salePrice = entry.item.resale.manualPrice ?? entry.item.resale.recommendedPrice;
      const credentials = createTemporaryCredentials(entry.item.accountId);
      try {
        const result = await api.publishToEldorado(entry.item.id, {
          title: entry.preview.title,
          description: entry.preview.description,
          priceUsd: toBase(salePrice, 'USD').amount,
          hasOriginalEmail: true,
          accountLogin: credentials.login,
          accountPassword: credentials.password,
          termsAccepted: true,
          rulesAccepted: true,
        });
        updateEntry(entry.item.id, { status: 'published', url: result.url });
      } catch (error) {
        updateEntry(entry.item.id, {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setProcessedCount((value) => value + 1);
      }
      if (entry !== queue.at(-1)) await wait(3_000);
    }

    setRunning(false);
    setFinished(true);
    onFinished();
  };

  return (
    <Modal
      open
      onClose={running ? () => undefined : onClose}
      title="Массовая публикация на Eldorado"
      description={`Выбрано аккаунтов: ${items.length}`}
      width="w-[720px]"
      footer={
        <>
          <Button
            size="md"
            className="h-10 px-5 text-[14px]"
            onClick={onClose}
            disabled={running}
          >
            {finished ? 'Закрыть' : 'Отмена'}
          </Button>
          {!finished ? (
            <Button
              variant="success"
              size="md"
              icon={Upload}
              className="h-10 px-5 text-[14px]"
              disabled={running || checking || readyCount === 0}
              onClick={() => void publishAll()}
            >
              {running
                ? `Публикация ${processedCount}/${queueTotal}`
                : `Опубликовать ${readyCount}`}
            </Button>
          ) : errorCount > 0 ? (
            <Button
              variant="default"
              size="md"
              className="h-10 px-5 text-[14px]"
              onClick={() => {
                setEntries((current) =>
                  current.map((entry) =>
                    entry.status === 'error' && entry.preview
                      ? { ...entry, status: 'ready', error: null }
                      : entry,
                  ),
                );
                setFinished(false);
              }}
            >
              Повторить ошибки
            </Button>
          ) : null}
        </>
      }
    >
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
        <div className="rounded-lg border border-[#594b25] bg-[#251f12] p-3 text-[11.5px] leading-relaxed text-[#e1ca82]">
          Нажимая «Опубликовать», вы принимаете правила Eldorado. Для каждого лота будут
          созданы временные реквизиты; замените их настоящими в Eldorado до завершения проверки.
          Публикация выполняется последовательно, по одному аккаунту.
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11.5px]">
          <div className="rounded-md border border-line bg-panel-2 p-2 text-ink-2">
            {finished ? 'Опубликовано' : 'Готово'}:{' '}
            <span className="num font-semibold text-ink">
              {finished ? publishedCount : readyCount}
            </span>
          </div>
          <div className="rounded-md border border-line bg-panel-2 p-2 text-ink-2">
            Ошибки: <span className="num font-semibold text-neg">{errorCount}</span>
          </div>
          <div className="rounded-md border border-line bg-panel-2 p-2 text-ink-2">
            Сумма:{' '}
            <span className="num font-semibold text-ink">
              {formatMoney({ amount: totalValue, currency: 'USD' })}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-line">
          {entries.map((entry) => {
            const salePrice = entry.item.resale.manualPrice ?? entry.item.resale.recommendedPrice;
            return (
              <div
                key={entry.item.id}
                className="grid grid-cols-[1fr_90px_130px] items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-ink">
                    {entry.item.accountId} · {entry.item.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-4">
                    <span>{entry.preview?.sourceImageUrls.length ?? 0} фото</span>
                    {entry.error ? (
                      <span
                        className="inline-flex min-w-0 items-center gap-1 truncate text-neg"
                        title={entry.error}
                      >
                        <AlertTriangle size={11} className="shrink-0" /> {entry.error}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="num text-right text-[12px] text-ink-2">
                  {formatMoney(toBase(salePrice, 'USD'))}
                </span>
                <div className="flex items-center justify-end gap-1.5 text-[11.5px] text-ink-2">
                  {statusIcon(entry.status)}
                  <span>{statusLabel[entry.status]}</span>
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Открыть лот"
                      className="text-accent"
                    >
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
