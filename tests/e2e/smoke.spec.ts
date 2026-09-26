import { expect, test, type Page, type Route } from '@playwright/test';

const user = { id: 'user-e2e', email: 'operator@example.com', displayName: 'Operator' };

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const mockApi = async (page: Page, initiallyAuthenticated = true) => {
  let authenticated = initiallyAuthenticated;
  const syncRequests: string[] = [];

  await page.route('http://127.0.0.1:5173/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/auth/me') {
      return authenticated ? json(route, { user }) : json(route, { error: 'Требуется вход' }, 401);
    }
    if (path === '/api/auth/login') {
      authenticated = true;
      return json(route, { user });
    }
    if (path === '/api/auth/logout') {
      authenticated = false;
      return json(route, { ok: true });
    }
    if (path === '/api/sync/run') {
      syncRequests.push(request.postData() ?? '');
      return json(route, { started: true, jobId: 'job-e2e' }, 202);
    }
    if (path === '/api/sync/status') {
      return json(route, {
        running: false,
        lastRun: null,
        autoSyncEnabled: false,
        nextRunAt: null,
      });
    }
    if (path === '/api/overview') {
      return json(route, {
        gameId: url.searchParams.get('gameId'),
        kpi: { foundToday: 0, analysed: 0, approved: 0, purchased: 0, listed: 0, sold: 0 },
        pipeline: { collected: 0, analyzed: 0, top: 0, approved: 0, purchased: 0, published: 0, sold: 0 },
        averageDealScore: 0,
      });
    }
    if (path === '/api/activity') return json(route, []);
    if (path === '/api/top' || path === '/api/qualified') return json(route, { items: [], total: 0 });
    if (path === '/api/listings') return json(route, { items: [], total: 0, page: 1, pageSize: 25 });
    if (path === '/api/inventory') {
      return json(route, { items: [], total: 0, capitalMinor: 0, expectedRevenueMinor: 0 });
    }
    if (path === '/api/destinations/eldorado/listings') {
      return json(route, { items: [], total: 0, remoteError: null });
    }
    if (path === '/api/destinations/eldorado/sales') return json(route, { items: [], total: 0 });
    if (path === '/api/destinations/eldorado/status') {
      return json(route, { configured: true, mode: 'ready_to_publish' });
    }
    if (path === '/api/profile/integrations') {
      return json(route, {
        funpay: { configured: true, requiresKey: false },
        eldorado: { configured: true, updatedAt: new Date().toISOString() },
        anthropic: { configured: false, updatedAt: null },
      });
    }
    return json(route, {});
  });

  return { syncRequests };
};

test('operator can sign in and reach the dashboard', async ({ page }) => {
  await mockApi(page, false);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Вход в GameStock' })).toBeVisible();
  await page.getByLabel('Электронная почта').fill('operator@example.com');
  await page.getByLabel('Пароль').fill('a-secure-password');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('heading', { name: 'Обзор', exact: true }).last()).toBeVisible();
  await expect(page.getByText('GameStock')).toBeVisible();
});

test('game selection, collection and all production routes remain usable', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/');
  await expect(page.getByText('GameStock')).toBeVisible();

  await page.getByRole('button', { name: /Clash Royale/ }).click();
  await page.getByText('Arknights', { exact: true }).last().click();
  await expect(page.getByText('Arknights', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Собрать сейчас' }).click();
  await expect(page.getByText('Сбор запущен')).toBeVisible();
  expect(JSON.parse(api.syncRequests[0])).toEqual({ gameId: 'eldorado-166' });

  const routes = [
    ['Маркетплейс', '/marketplace'],
    ['Топ аккаунтов', '/top-accounts'],
    ['Инвентарь', '/inventory'],
    ['Объявления', '/listings'],
    ['Продажи', '/sales'],
    ['Настройки', '/settings'],
  ] as const;
  for (const [label, path] of routes) {
    await page.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { name: label, exact: true }).last()).toBeVisible();
  }

  await page.getByRole('button', { name: 'Скрыть навигацию' }).click();
  await expect(page.getByRole('button', { name: 'Показать навигацию' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Показать навигацию' })).toBeVisible();
});
