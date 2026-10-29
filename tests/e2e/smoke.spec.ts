import { expect, test, type Page, type Route } from '@playwright/test';

const user = { id: 'user-e2e', email: 'operator@example.com', displayName: 'Operator' };

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

interface MockOfferOptions {
  requiredAttributes: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string }>;
  }>;
  requiredNumericAttributes: Array<{
    id: string; name: string; minValue: number; maxValue: number; precision: number; units: string | null;
  }>;
  tradeEnvironments: Array<{ id: string; name: string; value: string }>;
  defaultTradeEnvironmentId: string | null;
}

const emptyOfferOptions: MockOfferOptions = {
  requiredAttributes: [],
  requiredNumericAttributes: [],
  tradeEnvironments: [],
  defaultTradeEnvironmentId: null,
};

const mockApi = async (
  page: Page,
  initiallyAuthenticated = true,
  inventoryItems: unknown[] = [],
  offerOptionsByGame: Record<string, MockOfferOptions> = {},
) => {
  let authenticated = initiallyAuthenticated;
  const syncRequests: string[] = [];
  const publishRequests: string[] = [];

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
    if (path === '/api/auth/forgot-password') {
      return json(route, {
        ok: true,
        message: 'Если профиль существует, инструкция отправлена на указанную почту.',
      });
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
    if (/^\/api\/inventory\/[^/]+\/eldorado\/preview$/.test(path)) {
      const itemId = path.split('/')[3];
      const item = (inventoryItems as Array<{ id: string; gameId: string }>).find(
        (candidate) => candidate.id === itemId,
      );
      return json(route, {
        title: 'Production-ready account',
        description: 'Account details',
        gameId: '52',
        currency: 'USD',
        automaticDelivery: true,
        sourceImageUrls: item?.gameId === '8-ball-pool'
          ? ['/api/game-posters/8-ball-pool']
          : ['/api/listings/listing-e2e/images/1', '/api/listings/listing-e2e/images/2'],
        fallbackPoster: item?.gameId === '8-ball-pool',
        ...(offerOptionsByGame[item?.gameId ?? ''] ?? emptyOfferOptions),
      });
    }
    if (/^\/api\/inventory\/[^/]+\/eldorado\/publish$/.test(path)) {
      publishRequests.push(request.postData() ?? '');
      const itemId = path.split('/')[3];
      return json(route, {
        offerId: `offer-${itemId}`,
        url: `https://www.eldorado.gg/test/oa/offer-${itemId}`,
        publishedAt: new Date().toISOString(),
      });
    }
    if (path === '/api/inventory') {
      return json(route, {
        items: inventoryItems,
        total: inventoryItems.length,
        capitalMinor: inventoryItems.length * 1_000,
        expectedRevenueMinor: inventoryItems.length * 2_500,
      });
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
    if (path === '/api/operations/translation-observations') {
      return json(route, { items: [], total: 0 });
    }
    return json(route, {});
  });

  return { syncRequests, publishRequests };
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

test('password recovery does not reveal whether an account exists', async ({ page }) => {
  await mockApi(page, false);
  await page.goto('/');
  await page.getByRole('button', { name: 'Забыли пароль?' }).click();
  await page.getByLabel('Электронная почта').fill('unknown@example.com');
  await page.getByRole('button', { name: 'Отправить ссылку' }).click();
  await expect(page.getByText('Если профиль существует')).toBeVisible();
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

  await page.getByRole('button', { name: /Arknights/ }).first().click();
  await page.getByRole('searchbox', { name: 'Найти игру' }).fill('Zenless');
  await page.getByRole('menuitem', { name: 'Zenless Zone Zero' }).click();
  await expect(page.getByRole('button', { name: /Zenless Zone Zero/ })).toBeVisible();

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

test('bulk Eldorado publication prepares and publishes every selected account', async ({ page }) => {
  const inventoryItems = ['one', 'two'].map((suffix, index) => ({
    id: `item-${suffix}`,
    accountId: `account-${suffix}`,
    listingId: `listing-${suffix}`,
    gameId: 'clash-royale',
    title: `Account ${suffix}`,
    url: `https://funpay.com/lots/offer?id=${index + 1}`,
    purchase: {
      marketplace: 'funpay',
      price: { amount: 1_000, currency: 'RUB' },
      purchasedAt: new Date().toISOString(),
      orderRef: null,
      operator: 'e2e',
    },
    resale: {
      marketplace: 'eldorado',
      recommendedPrice: { amount: 2_500, currency: 'RUB' },
      manualPrice: null,
    },
    expectedProfit: { amount: 1_250, currency: 'RUB' },
    scores: null,
    status: 'purchased',
    updatedAt: new Date().toISOString(),
  }));
  const api = await mockApi(page, true, inventoryItems);
  await page.goto('/inventory');

  await page.getByRole('checkbox', { name: 'Выбрать все готовые аккаунты' }).check();
  await page.getByRole('button', { name: 'Опубликовать на Eldorado' }).click();
  await expect(page.getByRole('heading', { name: 'Массовая публикация на Eldorado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Опубликовать 2' })).toBeEnabled();
  await page.getByRole('button', { name: 'Опубликовать 2' }).click();

  await expect(page.getByText('Опубликовано:')).toBeVisible({ timeout: 15_000 });
  expect(api.publishRequests).toHaveLength(2);
  for (const raw of api.publishRequests) {
    const input = JSON.parse(raw) as Record<string, unknown>;
    expect(input.termsAccepted).toBe(true);
    expect(input.rulesAccepted).toBe(true);
    expect(String(input.accountLogin)).toMatch(/@gmail\.com$/);
  }
});

test('photo-less game shows the illustrative poster before publication', async ({ page }) => {
  const item = {
    id: 'item-poster', accountId: 'account-poster', listingId: 'listing-poster',
    gameId: '8-ball-pool', title: '8 Ball Pool account',
    url: 'https://funpay.com/lots/offer?id=123',
    purchase: { marketplace: 'funpay', price: { amount: 100, currency: 'RUB' },
      purchasedAt: new Date().toISOString(), orderRef: null, operator: 'e2e' },
    resale: { marketplace: 'eldorado', recommendedPrice: { amount: 200, currency: 'RUB' },
      manualPrice: null },
    expectedProfit: { amount: 100, currency: 'RUB' }, scores: null,
    status: 'purchased', updatedAt: new Date().toISOString(),
  };
  await mockApi(page, true, [item]);
  await page.goto('/inventory');
  await page.getByRole('button', { name: /Clash Royale/ }).click();
  await page.getByRole('searchbox', { name: 'Найти игру' }).fill('8 Ball Pool');
  await page.getByRole('menuitem', { name: '8 Ball Pool' }).click();
  await page.getByRole('checkbox', { name: 'Выбрать все готовые аккаунты' }).check();
  await page.getByRole('button', { name: 'Опубликовать на Eldorado' }).click();
  await expect(page.getByText('Иллюстративный постер (не скриншот аккаунта)')).toBeVisible();
});

const requiredSelect = (id: string, name: string, valueId: string, valueName: string) => ({
  id,
  name,
  values: [{ id: valueId, name: valueName }],
});
const requiredNumeric = (id: string, name: string) => ({
  id, name, minValue: 0, maxValue: 250_000, precision: 0, units: null,
});

const newGameCases: Array<{ gameId: string; options: MockOfferOptions }> = [
  {
    gameId: 'honkai-impact-3rd',
    options: {
      requiredAttributes: [],
      requiredNumericAttributes: [],
      tradeEnvironments: [{ id: '0', name: 'Region', value: 'EU' }],
      defaultTradeEnvironmentId: null,
    },
  },
  {
    gameId: 'rust',
    options: {
      requiredAttributes: [
        requiredSelect('premium-status', 'Premium Status', 'premium-yes', 'Yes'),
        requiredSelect('rust-hours', 'Hours Played', 'hours-099', '0-99'),
        requiredSelect('rust-skins', 'Skins', 'skins-014', '0-14'),
        requiredSelect('steam-account-level', 'Steam Account Level', 'level-05', '0-5'),
      ],
      requiredNumericAttributes: [
        requiredNumeric('rust-hours-played-numeric', 'Hours Played'),
        requiredNumeric('rust-skins-count-numeric', 'Skins'),
        requiredNumeric('rust-steam-account-level-numeric', 'Steam Account Level'),
      ],
      tradeEnvironments: [{ id: '0', name: 'Device', value: 'PC' }],
      defaultTradeEnvironmentId: null,
    },
  },
  {
    gameId: 'league-of-legends',
    options: {
      requiredAttributes: [
        requiredSelect('league-of-legends-champion-count', 'Champion Count', 'champion-119', '1-19'),
        requiredSelect('league-of-legends-previous-rank', 'Previous Rank', 'previous-unranked', 'Unranked'),
        requiredSelect('league-of-legends-ranked-ready', 'Ranked Ready', 'ready-yes', 'Yes'),
        requiredSelect('league-of-legends-riot-points', 'Riot Points', 'riot-999', '0-999'),
        requiredSelect('lol-blue-essence', 'Blue Essence', '0-19k-be', '0-19K BE'),
        requiredSelect('lol-current-rank', 'Current Rank', 'bronze', 'Bronze'),
        requiredSelect('lol-skins', 'Skins', '0-skins', '0 Skins'),
      ],
      requiredNumericAttributes: [
        requiredNumeric('league-of-legends-blue-essence-numeric', 'Blue Essence'),
        requiredNumeric('league-of-legends-champion-count-numeric', 'Champion Count'),
        requiredNumeric('league-of-legends-riot-points-numeric', 'Riot Points'),
        requiredNumeric('league-of-legends-skins-numeric', 'Skins'),
      ],
      tradeEnvironments: [{ id: '2', name: 'Server', value: 'Europe West' }],
      defaultTradeEnvironmentId: null,
    },
  },
  {
    gameId: 'mobile-legends',
    options: {
      requiredAttributes: [
        requiredSelect('mobile-legends-region', 'Region', 'region-global', 'Global'),
      ],
      requiredNumericAttributes: [],
      tradeEnvironments: [{ id: '0', name: 'Device', value: 'Android' }],
      defaultTradeEnvironmentId: null,
    },
  },
  {
    gameId: 'clash-of-clans',
    options: {
      requiredAttributes: [
        requiredSelect('clash-of-clans-current-rank', 'Current Rank', 'rank-unranked', 'Unranked'),
        requiredSelect('clash-of-clans-maxed-account', 'Maxed Account', 'maxed-yes', 'Yes'),
        requiredSelect('clash-of-clans-town-hall', 'Town Hall', 'hall-13', '1-3'),
        requiredSelect('coc-gems', 'Gems', 'gems-0499', '0-499'),
      ],
      requiredNumericAttributes: [
        requiredNumeric('clash-of-clans-gems-numeric', 'Gems'),
        requiredNumeric('clash-of-clans-town-hall-numeric', 'Town Hall'),
      ],
      tradeEnvironments: [],
      defaultTradeEnvironmentId: null,
    },
  },
];

for (const { gameId, options } of newGameCases) {
  test(`${gameId} requires its Eldorado fields before bulk publication`, async ({ page }) => {
    const item = {
      id: `item-${gameId}`,
      accountId: `account-${gameId}`,
      listingId: `listing-${gameId}`,
      gameId,
      title: `${gameId} account`,
      url: 'https://funpay.com/lots/offer?id=123',
      purchase: {
        marketplace: 'funpay',
        price: { amount: 1_000, currency: 'RUB' },
        purchasedAt: new Date().toISOString(),
        orderRef: null,
        operator: 'e2e',
      },
      resale: {
        marketplace: 'eldorado',
        recommendedPrice: { amount: 2_000, currency: 'RUB' },
        manualPrice: null,
      },
      expectedProfit: { amount: 1_000, currency: 'RUB' },
      scores: null,
      status: 'purchased',
      updatedAt: new Date().toISOString(),
    };
    const api = await mockApi(page, true, [item], { [gameId]: options });
    await page.goto('/inventory');
    await page.getByRole('checkbox', { name: 'Выбрать все готовые аккаунты' }).check();
    await page.getByRole('button', { name: 'Опубликовать на Eldorado' }).click();

    const dialog = page.getByRole('dialog');
    const publish = dialog.getByRole('button', { name: 'Заполните параметры' });
    await expect(publish).toBeDisabled();
    const selects = dialog.locator('select');
    const expectedSelectCount = options.requiredAttributes.length +
      (options.tradeEnvironments.length > 0 ? 1 : 0);
    await expect(selects).toHaveCount(expectedSelectCount);
    for (let index = 0; index < expectedSelectCount; index += 1) {
      await selects.nth(index).selectOption({ index: 1 });
    }
    const numericInputs = dialog.locator('input[type="number"]');
    await expect(numericInputs).toHaveCount(options.requiredNumericAttributes.length);
    for (let index = 0; index < options.requiredNumericAttributes.length; index += 1) {
      await numericInputs.nth(index).fill('1');
    }

    await dialog.getByRole('button', { name: 'Опубликовать 1' }).click();
    await expect(dialog.getByText('Опубликовано:')).toBeVisible();
    expect(api.publishRequests).toHaveLength(1);
    const input = JSON.parse(api.publishRequests[0]) as {
      tradeEnvironmentId: string | null;
      offerAttributes: Record<string, string>;
      numericAttributes: Record<string, number>;
    };
    expect(input.tradeEnvironmentId).toBe(options.tradeEnvironments[0]?.id ?? null);
    for (const attribute of options.requiredAttributes) {
      expect(input.offerAttributes[attribute.id]).toBe(attribute.values[0].id);
    }
    for (const attribute of options.requiredNumericAttributes) {
      expect(input.numericAttributes[attribute.id]).toBe(1);
    }
  });
}
