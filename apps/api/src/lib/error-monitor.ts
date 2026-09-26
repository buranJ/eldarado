import { env } from './env.js';

const THROTTLE_MS = 60_000;
const lastSent = new Map<string, number>();

/** Sends a compact operational alert without request bodies, cookies or credentials. */
export const reportOperationalError = (details: {
  method: string;
  url: string;
  message: string;
}): void => {
  if (!env.monitorWebhookUrl) return;
  const key = `${details.method}:${details.url}:${details.message}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < THROTTLE_MS) return;
  lastSent.set(key, now);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  void fetch(env.monitorWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `GameStock [ERROR] ${details.method} ${details.url}: ${details.message}`,
    }),
    signal: controller.signal,
  })
    .catch(() => undefined)
    .finally(() => clearTimeout(timeout));
};
