export const formatNumber = (value: number | null | undefined, fallback = '—'): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/** Compact form for large resource counts: 1.85 млн, 620 тыс. */
export const formatCompact = (value: number | null | undefined, fallback = '—'): string => {
  if (value === null || value === undefined) return fallback;
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2)} млн`.replace('.', ',');
  }
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)} тыс.`;
  return formatNumber(value);
};

export const formatPercent = (
  value: number | null | undefined,
  options: { signed?: boolean; decimals?: number } = {},
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const decimals = options.decimals ?? (Math.abs(value) < 10 ? 1 : 0);
  const sign = options.signed && value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(decimals).replace('.', ',')}%`;
};

export const formatRating = (value: number | null): string =>
  value === null ? '—' : value.toFixed(1).replace('.', ',');

export const NO_DATA = 'Нет данных';

export const orNoData = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? NO_DATA : String(value);

export const formatBool = (value: boolean | null): string =>
  value === null ? NO_DATA : value ? 'Да' : 'Нет';

export const formatCount = (
  value: number | null,
  total: number | null,
  fallback = '—',
): string => {
  if (value === null) return fallback;
  return total === null ? formatNumber(value) : `${formatNumber(value)} / ${formatNumber(total)}`;
};
