import type { SourceAdapter, RawOffer } from '../types.js';
import { parseCategory } from './parse.js';
import {
  FUNPAY_ALLOWED_PATH,
  FUNPAY_BASE,
  FUNPAY_CATEGORIES,
  MIN_REQUEST_INTERVAL_MS,
  REQUEST_HEADERS,
} from './config.js';

let lastRequestAt = 0;

const throttle = async (): Promise<void> => {
  const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
};

const fetchPath = async (path: string): Promise<string> => {
  if (!FUNPAY_ALLOWED_PATH.test(path)) {
    throw new Error(
      `Путь ${path} не разрешён: собираем только страницы категорий (robots.txt запрещает /*/offer)`,
    );
  }
  await throttle();
  const response = await fetch(`${FUNPAY_BASE}${path}`, { headers: REQUEST_HEADERS });
  if (!response.ok) {
    throw new Error(`FunPay ответил ${response.status} на ${path}`);
  }
  return response.text();
};

export const funPayAdapter: SourceAdapter = {
  id: 'funpay',
  name: 'FunPay',

  supports: (gameId) => gameId in FUNPAY_CATEGORIES,

  async collect(gameId): Promise<RawOffer[]> {
    const category = FUNPAY_CATEGORIES[gameId];
    if (!category) throw new Error(`FunPay: категория для игры ${gameId} не настроена`);
    const html = await fetchPath(`/lots/${category.lotId}/`);
    return parseCategory(html);
  },

  /**
   * Stage 5 will need per-listing liveness checks. The listing page itself is
   * disallowed by robots.txt, so liveness is derived from the category sweep:
   * an offer missing from the latest collection is treated as gone.
   */
  async isAlive(): Promise<boolean> {
    throw new Error(
      'FunPay: проверка отдельного лота недоступна — актуальность определяется по обходу категории',
    );
  },
};
