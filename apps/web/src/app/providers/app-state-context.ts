import { createContext, useContext } from 'react';
import type { CurrencyCode, GameId, InventoryStatus } from '@gamestock/domain';

export interface AppStateApi {
  /** Currently selected game — every screen is scoped to it. */
  gameId: GameId;
  setGameId: (gameId: GameId) => void;

  baseCurrency: CurrencyCode;
  setBaseCurrency: (currency: CurrencyCode) => void;

  /**
   * Bumped whenever server-side data changes, so screens reading from the API
   * know to refetch.
   */
  dataVersion: number;
  notifyDataChanged: () => void;

  /* Operator decisions — approval immediately creates an inventory item. */
  approveAccount: (listingId: string) => void;
  rejectAccount: (listingId: string) => void;
  bulkApproveAccounts: (listingIds: string[]) => Promise<boolean>;
  bulkRejectAccounts: (listingIds: string[]) => Promise<boolean>;
  purchaseAccount: (listingId: string) => void;

  /* Inventory — persisted through the API. */
  setManualPrice: (inventoryItemId: string, amount: number | null) => void;
  setInventoryStatus: (inventoryItemId: string, status: InventoryStatus) => void;
}

export const AppStateContext = createContext<AppStateApi | null>(null);

export const useAppState = (): AppStateApi => {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
};
