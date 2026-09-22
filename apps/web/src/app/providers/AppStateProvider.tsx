import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppStateContext } from './app-state-context';
import type { AppStateApi } from './app-state-context';
import { useToast } from './toast-context';
import { api } from '@/api/client';
import { SALES_FIXTURE } from '@/data/sales';
import { DEFAULT_GAME_ID } from '@/config/games';
import { DEFAULT_BASE_CURRENCY } from '@/config/app';
import type { CurrencyCode, GameId, InventoryStatus } from '@gamestock/domain';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  const [gameId, setGameId] = useState<GameId>(DEFAULT_GAME_ID);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(DEFAULT_BASE_CURRENCY);
  const [dataVersion, setDataVersion] = useState(0);
  const [sales] = useState(() => SALES_FIXTURE);

  const notifyDataChanged = useCallback(() => setDataVersion((value) => value + 1), []);

  /** Runs a write, refreshes dependent screens, and reports the outcome once. */
  const mutate = useCallback(
    async (
      action: () => Promise<unknown>,
      success: { title: string; description?: string },
      failureTitle: string,
    ): Promise<boolean> => {
      try {
        await action();
        notifyDataChanged();
        toast.push({ tone: 'success', ...success });
        return true;
      } catch (error) {
        toast.push({
          tone: 'error',
          title: failureTitle,
          description: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [notifyDataChanged, toast],
  );

  const approveAccount = useCallback(
    (listingId: string) => {
      void mutate(
        () => api.approve(listingId),
        { title: 'Аккаунт добавлен в инвентарь' },
        'Не удалось одобрить аккаунт',
      );
    },
    [mutate],
  );

  const bulkApproveAccounts = useCallback(
    (listingIds: string[]) =>
      mutate(
        () => api.bulkDecision(listingIds, 'approve'),
        {
          title: `Добавлено в инвентарь: ${listingIds.length}`,
          description: 'Все выбранные аккаунты одобрены.',
        },
        'Не удалось одобрить выбранные аккаунты',
      ),
    [mutate],
  );

  const bulkRejectAccounts = useCallback(
    (listingIds: string[]) =>
      mutate(
        () => api.bulkDecision(listingIds, 'reject'),
        { title: `Отклонено аккаунтов: ${listingIds.length}` },
        'Не удалось отклонить выбранные аккаунты',
      ),
    [mutate],
  );

  const rejectAccount = useCallback(
    (listingId: string) => {
      void mutate(
        () => api.reject(listingId),
        { title: 'Аккаунт отклонён' },
        'Не удалось отклонить аккаунт',
      );
    },
    [mutate],
  );

  const purchaseAccount = useCallback(
    (listingId: string) => {
      void mutate(
        () => api.purchase(listingId),
        {
          title: 'Аккаунт добавлен в инвентарь',
          description: 'Оплату на площадке-источнике нужно провести вручную.',
        },
        'Не удалось оформить покупку',
      );
    },
    [mutate],
  );

  const setManualPrice = useCallback(
    (inventoryItemId: string, amount: number | null) => {
      void mutate(
        () => api.setInventoryPrice(inventoryItemId, amount),
        { title: 'Цена продажи обновлена' },
        'Не удалось изменить цену',
      );
    },
    [mutate],
  );

  const setInventoryStatus = useCallback(
    (inventoryItemId: string, status: InventoryStatus) => {
      const titles: Record<InventoryStatus, string> = {
        purchased: 'Позиция возвращена в статус «куплен»',
        preparing: 'Позиция в подготовке',
        ready_to_list: 'Позиция готова к публикации',
        listed: 'Позиция отмечена как опубликованная',
        reserved: 'Позиция зарезервирована',
        sold: 'Позиция отмечена как проданная',
      };
      void mutate(
        () => api.setInventoryStatus(inventoryItemId, status),
        { title: titles[status] },
        'Не удалось изменить статус',
      );
    },
    [mutate],
  );

  const value = useMemo<AppStateApi>(
    () => ({
      gameId,
      setGameId,
      baseCurrency,
      setBaseCurrency,
      dataVersion,
      notifyDataChanged,
      approveAccount,
      rejectAccount,
      bulkApproveAccounts,
      bulkRejectAccounts,
      purchaseAccount,
      setManualPrice,
      setInventoryStatus,
      sales: sales.filter((sale) => sale.gameId === gameId),
    }),
    [
      gameId,
      baseCurrency,
      dataVersion,
      notifyDataChanged,
      approveAccount,
      rejectAccount,
      bulkApproveAccounts,
      bulkRejectAccounts,
      purchaseAccount,
      setManualPrice,
      setInventoryStatus,
      sales,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
