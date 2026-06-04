import { expect, type Page, test } from '@playwright/test';

const DIRECT_LAUNCH_ROUTES = [
  {
    name: 'dogfight',
    url: '/#/fly?mode=dogfight&map=desert_expanse&aircraft=spitfire&difficulty=rookie',
  },
  {
    name: 'zen',
    url: '/#/fly?mode=zen&map=desert_expanse&aircraft=storybook_biplane&difficulty=rookie',
  },
  {
    name: 'expedition',
    url: '/#/fly?mode=free&map=ocean_islands&aircraft=sunny_biplane&difficulty=rookie',
  },
  {
    name: 'tutorial',
    url: '/#/fly?tutorial=1&mode=dogfight&map=desert_expanse&aircraft=spitfire&difficulty=rookie',
  },
] as const;

function watchForRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') errors.push(`console.error: ${text}`);
    if (message.type() === 'warning' && text.includes('Game init completed after unmount; start skipped')) {
      errors.push(`console.warning: ${text}`);
    }
  });
  return errors;
}

async function expectNoViteOverlay(page: Page) {
  await expect(page.locator('.vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('#webpack-dev-server-client-overlay')).toHaveCount(0);
}

async function waitForFlightReady(page: Page) {
  await expect(page.getByText('LOADING')).toBeHidden({ timeout: 45_000 });
  await expectNoViteOverlay(page);

  const canvas = page.locator('canvas.neuroflight-flight-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(300);
  expect(box?.height ?? 0).toBeGreaterThan(240);

  await expect(page.getByText(/Readiness|Tutorial|Session briefing|Speed|Throttle|Camera optional/i).first()).toBeVisible(
    { timeout: 12_000 },
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 820 });
});

test('home renders launch controls without browser errors', async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/NeuroFlight/);
  await expect(page.getByRole('button', { name: /neuroflight home/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /tutorial/i })).toBeVisible();
  await expectNoViteOverlay(page);
  expect(errors).toEqual([]);
});

for (const route of DIRECT_LAUNCH_ROUTES) {
  test(`direct ${route.name} route leaves loading and shows flight UI`, async ({ page }) => {
    const errors = watchForRuntimeErrors(page);
    await page.goto(route.url);
    await waitForFlightReady(page);
    expect(errors).toEqual([]);
  });
}

test('game can be entered repeatedly without stale StrictMode launch warnings', async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  const route = DIRECT_LAUNCH_ROUTES[0].url;

  for (let i = 0; i < 3; i++) {
    await page.goto(route);
    await waitForFlightReady(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /neuroflight home/i })).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test('flight route accepts basic readiness and keyboard interaction', async ({ page }) => {
  const errors = watchForRuntimeErrors(page);
  await page.goto(DIRECT_LAUNCH_ROUTES[0].url);
  await waitForFlightReady(page);

  const behaviorOnly = page.getByRole('button', { name: /continue behavior-only/i });
  const beginSession = page.getByRole('button', { name: /begin session/i });
  if (await behaviorOnly.isVisible().catch(() => false)) {
    await behaviorOnly.click();
  } else if (await beginSession.isVisible().catch(() => false)) {
    await beginSession.click();
  }

  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyA');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Space');
  await page.keyboard.up('Shift');

  await expect(page.locator('canvas.neuroflight-flight-canvas')).toBeVisible();
  await expectNoViteOverlay(page);
  expect(errors).toEqual([]);
});
