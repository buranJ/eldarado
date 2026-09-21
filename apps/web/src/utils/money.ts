import { FX_TO_USD } from '@/config/app';
import type { CurrencyCode, Money } from '@gamestock/domain';

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
};

const SUFFIXED: CurrencyCode[] = ['RUB'];

const groupDigits = (value: number, fractionDigits: number): string =>
  value
    .toFixed(fractionDigits)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    .replace('.', ',');

export const money = (amount: number, currency: CurrencyCode = 'USD'): Money => ({
  amount,
  currency,
});

export const formatMoney = (
  value: Money | null | undefined,
  options: { decimals?: number; signed?: boolean } = {},
): string => {
  if (!value) return '—';
  const decimals =
    options.decimals ?? (Math.abs(value.amount) < 100 && value.amount % 1 !== 0 ? 2 : 0);
  const symbol = SYMBOLS[value.currency];
  const sign = options.signed && value.amount > 0 ? '+' : value.amount < 0 ? '−' : '';
  const body = groupDigits(Math.abs(value.amount), decimals);
  return SUFFIXED.includes(value.currency)
    ? `${sign}${body} ${symbol}`
    : `${sign}${symbol}${body}`;
};

export const toBase = (value: Money, base: CurrencyCode = 'USD'): Money => ({
  amount: (value.amount * FX_TO_USD[value.currency]) / FX_TO_USD[base],
  currency: base,
});

export const sumMoney = (values: Money[], base: CurrencyCode = 'USD'): Money => ({
  amount: values.reduce((acc, v) => acc + toBase(v, base).amount, 0),
  currency: base,
});

export const currencySymbol = (currency: CurrencyCode): string => SYMBOLS[currency];
