import type { CurrencyCode } from '@gamestock/domain';

export const APP_NAME = 'GameStock';
export const APP_VERSION = '0.1.0';

/** Automatic collection runs once per day when enabled. */
export const SCAN_INTERVAL_HOURS = 24;

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'RUB'];
export const DEFAULT_BASE_CURRENCY: CurrencyCode = 'USD';

/** Static conversion rates — replaced by a rates service later. */
export const FX_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 1.08,
  RUB: 0.011,
};

export const TOP_ACCOUNTS_LIMIT = 100;
