import type { BadgeTone } from '@/components/ui/Badge';
import type {
  AccountStatus,
  AnalysisStatus,
  InventoryStatus,
  ListingStatus,
  SaleStatus,
} from '@gamestock/domain';

export interface StatusDef {
  label: string;
  tone: BadgeTone;
}

export const ACCOUNT_STATUS: Record<AccountStatus, StatusDef> = {
  new: { label: 'Новый', tone: 'muted' },
  prefiltered_out: { label: 'Отсеян фильтром', tone: 'muted' },
  ready_for_analysis: { label: 'Прошёл проверку', tone: 'info' },
  analyzed: { label: 'Проверен', tone: 'info' },
  needs_review: { label: 'Требует проверки', tone: 'warn' },
  approved: { label: 'Одобрен', tone: 'pos' },
  rejected: { label: 'Отклонён', tone: 'neg' },
  purchased: { label: 'Куплен', tone: 'violet' },
};

export const ANALYSIS_STATUS: Record<AnalysisStatus, StatusDef> = {
  pending: { label: 'В очереди', tone: 'muted' },
  analyzed: { label: 'Проверен', tone: 'info' },
  needs_review: { label: 'Требует проверки', tone: 'warn' },
  failed: { label: 'Ошибка', tone: 'neg' },
};

export const INVENTORY_STATUS: Record<InventoryStatus, StatusDef> = {
  purchased: { label: 'Куплен', tone: 'violet' },
  preparing: { label: 'Подготовка', tone: 'warn' },
  ready_to_list: { label: 'Готов к публикации', tone: 'info' },
  listed: { label: 'Опубликован', tone: 'pos' },
  reserved: { label: 'Зарезервирован', tone: 'accent' },
  sold: { label: 'Продан', tone: 'muted' },
};

export const LISTING_STATUS: Record<ListingStatus, StatusDef> = {
  draft: { label: 'Черновик', tone: 'muted' },
  published: { label: 'Опубликовано', tone: 'pos' },
  paused: { label: 'Приостановлено', tone: 'warn' },
  sold: { label: 'Продано', tone: 'accent' },
  closed: { label: 'Закрыто', tone: 'muted' },
  error: { label: 'Ошибка', tone: 'neg' },
  deleted: { label: 'Удалено', tone: 'muted' },
};

export const SALE_STATUS: Record<SaleStatus, StatusDef> = {
  completed: { label: 'Завершена', tone: 'pos' },
  pending_payout: { label: 'Ожидает выплаты', tone: 'warn' },
  canceled: { label: 'Отменён', tone: 'muted' },
  refunded: { label: 'Возврат', tone: 'neg' },
  disputed: { label: 'Спор', tone: 'neg' },
};

export type StatusDomain = 'account' | 'analysis' | 'inventory' | 'listing' | 'sale';

export const STATUS_MAPS: Record<StatusDomain, Record<string, StatusDef>> = {
  account: ACCOUNT_STATUS,
  analysis: ANALYSIS_STATUS,
  inventory: INVENTORY_STATUS,
  listing: LISTING_STATUS,
  sale: SALE_STATUS,
};
