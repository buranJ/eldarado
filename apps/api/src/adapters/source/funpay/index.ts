import type { SourceAdapter, RawOffer, SourceImage } from '../types.js';
import {
  parseCategory,
  parseOfferImageUrls,
  parseOfferIsLive,
  selectNewestOffers,
} from './parse.js';
import {
  FUNPAY_ALLOWED_PATH,
  FUNPAY_BASE,
  FUNPAY_CATEGORIES,
  FUNPAY_COLLECTION_LIMIT,
  MIN_REQUEST_INTERVAL_MS,
  REQUEST_HEADERS,
} from './config.js';

let lastRequestAt = 0;

const throttle = async (): Promise<void> => {
  const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
};

const fetchPublic = async (path: string): Promise<Response> => {
  if (!FUNPAY_ALLOWED_PATH.test(path)) {
    throw new Error(
      `Путь ${path} не разрешён: доступны только категория и публичная страница лота`,
    );
  }
  await throttle();
  return fetch(`${FUNPAY_BASE}${path}`, { headers: REQUEST_HEADERS });
};

const fetchPath = async (path: string): Promise<string> => {
  const response = await fetchPublic(path);
  if (!response.ok) {
    throw new Error(`FunPay ответил ${response.status} на ${path}`);
  }
  return response.text();
};

const imageExtension = (mimeType: string, url: string): string | null => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg';
  if (pathname.endsWith('.png')) return 'png';
  return null;
};

const downloadImage = async (sourceUrl: string): Promise<SourceImage | null> => {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'sfunpay.com' || !url.pathname.startsWith('/s/offer/')) {
    return null;
  }
  const response = await fetch(url, { headers: REQUEST_HEADERS });
  if (!response.ok) return null;
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > 10 * 1024 * 1024) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return null;
  const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
  const extension = imageExtension(mimeType, sourceUrl);
  if (!extension) return null;
  return { sourceUrl, bytes, mimeType: mimeType || `image/${extension}`, extension };
};

export const funPayAdapter: SourceAdapter = {
  id: 'funpay',
  name: 'FunPay',

  supports: (gameId) => gameId in FUNPAY_CATEGORIES,

  async collect(gameId): Promise<RawOffer[]> {
    const category = FUNPAY_CATEGORIES[gameId];
    if (!category) throw new Error(`FunPay: категория для игры ${gameId} не настроена`);
    const html = await fetchPath(`/lots/${category.lotId}/`);
    return selectNewestOffers(parseCategory(html, gameId), FUNPAY_COLLECTION_LIMIT);
  },

  async loadImages(externalId, limit = 4): Promise<SourceImage[]> {
    if (!/^\d+$/.test(externalId)) return [];
    const html = await fetchPath(`/lots/offer?id=${externalId}`);
    const urls = parseOfferImageUrls(html).slice(0, Math.max(1, Math.min(limit, 4)));
    const downloaded = await Promise.all(urls.map(downloadImage));
    return downloaded.filter((image): image is SourceImage => image !== null);
  },

  async isAlive(externalId): Promise<boolean> {
    if (!/^\d+$/.test(externalId)) return false;
    const response = await fetchPublic(`/lots/offer?id=${externalId}`);
    if (response.status === 404 || response.status === 410) return false;
    if (!response.ok) {
      throw new Error(`FunPay ответил ${response.status} при проверке лота ${externalId}`);
    }
    const html = await response.text();
    if (parseOfferIsLive(html, externalId)) return true;
    throw new Error(`FunPay: не удалось определить состояние лота ${externalId}`);
  },
};
