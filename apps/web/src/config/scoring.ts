import type { Score } from '@gamestock/domain';

export interface ScoreTone {
  key: 'strong' | 'good' | 'average' | 'weak';
  label: string;
  /** Tailwind token names used by badges. */
  color: 'pos' | 'accent' | 'warn' | 'neg';
}

/** Deal Score is the headline product metric — labels are shown next to it. */
export const dealScoreTone = (score: Score): ScoreTone => {
  if (score >= 90) return { key: 'strong', label: 'Отличная сделка', color: 'pos' };
  if (score >= 75) return { key: 'good', label: 'Хорошая', color: 'accent' };
  if (score >= 55) return { key: 'average', label: 'Средняя', color: 'warn' };
  return { key: 'weak', label: 'Слабая', color: 'neg' };
};

export const qualityScoreTone = (score: Score): ScoreTone => {
  if (score >= 90) return { key: 'strong', label: 'Максимальный', color: 'pos' };
  if (score >= 75) return { key: 'good', label: 'Высокий', color: 'accent' };
  if (score >= 55) return { key: 'average', label: 'Средний', color: 'warn' };
  return { key: 'weak', label: 'Низкий', color: 'neg' };
};

export type RiskLevel = 'low' | 'medium' | 'high';

export const riskLevel = (score: Score): RiskLevel => {
  if (score <= 33) return 'low';
  if (score <= 66) return 'medium';
  return 'high';
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
};

/** Inputs of the Deal Score, shown on the AI analysis page. */
export const DEAL_SCORE_INPUTS: { label: string; hint: string }[] = [
  { label: 'Account Quality', hint: 'Качество аккаунта как товара' },
  { label: 'Цена покупки', hint: 'Стоимость лота на источнике' },
  { label: 'Рыночная оценка', hint: 'Оценка справедливой стоимости' },
  { label: 'Похожие объявления', hint: 'Сравнение с сопоставимыми лотами' },
  { label: 'Ожидаемая цена перепродажи', hint: 'Прогноз цены на площадке продажи' },
  { label: 'Ожидаемая маржа', hint: 'Прибыль после комиссий' },
  { label: 'Риск передачи', hint: 'Доступ, перепривязка, ограничения' },
  { label: 'Надёжность продавца', hint: 'Рейтинг, отзывы, возраст аккаунта' },
];

/** Inputs of the Risk Score. */
export const RISK_SCORE_INPUTS: string[] = [
  'Отсутствие полного доступа',
  'Невозможность перепривязки',
  'Подозрительно низкая цена',
  'Мало данных в объявлении',
  'Противоречия между заголовком, описанием и скриншотами',
  'Неизвестный источник',
  'Плохая репутация продавца',
  'Новый продавец',
  'Подозрительные характеристики',
];
