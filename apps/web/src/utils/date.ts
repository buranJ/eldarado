const RU_MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

const pad = (n: number): string => String(n).padStart(2, '0');

export const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 3_600_000).toISOString();

export const daysAgo = (days: number): string => hoursAgo(days * 24);

export const isToday = (iso: string): boolean => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

/** "19 авг, 14:32" — compact absolute stamp for dense tables. */
export const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const plural = (n: number, forms: [string, string, string]): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
};

/** "12 мин назад", "3 ч назад", "2 дн назад". */
export const formatRelative = (iso: string | null): string => {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} ${plural(minutes, ['мин', 'мин', 'мин'])} назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${plural(hours, ['ч', 'ч', 'ч'])} назад`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
  const months = Math.round(days / 30);
  return `${months} ${plural(months, ['мес', 'мес', 'мес'])} назад`;
};

export const formatDuration = (hours: number): string =>
  hours >= 1
    ? `${Math.round(hours)} ${plural(Math.round(hours), ['ч', 'ч', 'ч'])}`
    : `${Math.max(1, Math.round(hours * 60))} мин`;

/** Next occurrence of the daily collection hour, in local time. */
export const nextDailyRun = (hour: number, from: number): Date => {
  const next = new Date(from);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= from) next.setDate(next.getDate() + 1);
  return next;
};
