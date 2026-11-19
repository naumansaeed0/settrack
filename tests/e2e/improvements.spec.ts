import { expect, test } from '@playwright/test';

test('demo visitors can start a clean personal journal and keep that workspace on their next visit', async ({ page }) => {
  await page.goto('./#dashboard');
  await expect(page.getByRole('region', { name: 'About the demo journal' })).toBeVisible();
  await page.getByRole('button', { name: 'Use my journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your first workout', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use Upper Body A', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Upper Body A', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('0 completed workouts')).toBeVisible();
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^My journal/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'About the demo journal' })).toHaveCount(0);
  await page.goto('./?workspace=demo#history');
  await expect(page.getByText('9 completed workouts')).toBeVisible();
});

test('history filters find sessions and repeating one preserves history and the offline draft', async ({ page, context }) => {
  await page.goto('./#history');
  await page.getByRole('searchbox', { name: 'Search workouts' }).fill('upper bench');
  await expect(page.getByText('Showing 6 of 9 workouts')).toBeVisible();
  await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('squat');
  await expect(page.getByText('No workouts match', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('combobox', { name: 'Period', exact: true }).selectOption('7');
  await expect(page.getByText('Showing 3 of 9 workouts')).toBeVisible();
  await page.getByRole('button', { name: /Upper Body A.*12 sets/ }).first().click();
  await page.getByRole('button', { name: 'Repeat workout', exact: true }).click();
  const bench = page.getByRole('region', { name: 'Bench Press' });
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' })).toHaveValue('60');
  await expect(bench.getByRole('button', { name: 'Bench Press set 1 complete' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('0 of 12 sets completed', { exact: false })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('9 completed workouts')).toBeVisible();
  await page.getByRole('button', { name: /Upper Body A.*12 sets/ }).first().click();
  await expect(page.getByRole('button', { name: 'Repeat workout', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' })).toHaveValue('60');
  await expect(page.getByText('You’re offline. Your journal still saves on this device.')).toBeVisible();
});

test('faster set entry preserves edits and draft changes survive an offline reload', async ({ page, context }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  const bench = page.getByRole('region', { name: 'Bench Press', exact: true });
  await bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' }).fill('62.5');
  await bench.getByRole('button', { name: 'Bench Press set 1 complete', exact: true }).click();
  await bench.getByRole('spinbutton', { name: 'Bench Press set 2 weight in kg' }).fill('55');
  await bench.getByRole('button', { name: 'Use last weights', exact: true }).click();
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' })).toHaveValue('62.5');
  await expect(bench.getByRole('button', { name: 'Bench Press set 1 undo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 2 weight in kg' })).toHaveValue('55');
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 3 weight in kg' })).toHaveValue('60');
  await bench.getByRole('button', { name: 'Add set', exact: true }).click();
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 4 weight in kg' })).toHaveValue('60');
  await expect(bench.getByRole('button', { name: 'Bench Press set 4 complete', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await bench.getByRole('button', { name: 'Remove last set', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 4 weight in kg' })).toBeVisible();
  await bench.getByRole('button', { name: 'Remove last set', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove set', exact: true }).click();
  await page.getByRole('region', { name: 'Barbell Row', exact: true }).getByRole('button', { name: 'Remove exercise', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove exercise', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Barbell Row', exact: true })).toHaveCount(0);
  await expect(page.getByRole('progressbar', { name: 'Workout completion' })).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Rename workout', exact: true }).click();
  await page.getByRole('textbox', { name: 'Workout name', exact: true }).fill('Push strength');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Push strength', exact: true })).toBeVisible();
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' })).toHaveValue('62.5');
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 4 weight in kg' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Barbell Row', exact: true })).toHaveCount(0);
});

test('rest controls stay accessible on desktop and compact on phones', async ({ page }, info) => {
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  if (info.project.name === 'desktop') {
    await expect(page.getByRole('spinbutton', { name: 'Rest duration in seconds' })).toBeVisible();
    return;
  }
  const panel = page.getByRole('complementary', { name: 'Rest timer and workout actions' });
  await expect(page.getByRole('button', { name: 'Show rest controls', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect((await panel.boundingBox())!.height).toBeLessThan(100);
  await expect(page.getByRole('spinbutton', { name: 'Rest duration in seconds' })).toBeHidden();
  await page.getByRole('button', { name: 'Show rest controls', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Rest duration in seconds' }).fill('30');
  await page.getByRole('button', { name: 'Start 30s', exact: true }).click();
  await page.getByRole('button', { name: 'Hide rest controls', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByRole('timer')).toHaveAttribute('aria-label', '28 seconds remaining');
  expect((await panel.boundingBox())!.height).toBeLessThan(100);
  await expect(page.getByRole('button', { name: 'Finish workout', exact: true })).toBeVisible();
});

test('overview lift selection carries through to detailed progress', async ({ page }) => {
  await page.goto('./#dashboard');
  await page.getByRole('combobox', { name: 'Overview exercise', exact: true }).selectOption('squat');
  await expect(page.getByRole('heading', { name: 'Back Squat', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Back Squat, heaviest set per workout in kg', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Exercise progress', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Exercise', exact: true })).toHaveValue('squat');
});

test('narrow phone and tablet screens avoid horizontal scrolling', async ({ page }, info) => {
  const width = info.project.name === 'phone' ? 320 : 768;
  await page.setViewportSize({ width, height: 900 });
  await page.goto('./#dashboard');
  await page.getByRole('heading', { name: 'Training overview' }).waitFor();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  if (width === 320) {
    await page.getByRole('button', { name: 'Show rest controls', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: `test-results/responsive-${width}.png`, fullPage: true });
});

test('workspace selection stays consistent with browser back and forward navigation', async ({ page }) => {
  await page.goto('./?workspace=demo#dashboard');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /^Demo journal/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Demo journal/ }).click();
  await expect(page.getByRole('heading', { name: 'Workout history' })).toBeVisible();
  await expect(page).toHaveURL(/#history$/);
  await page.getByRole('button', { name: /^Demo journal/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^My journal/ }).click();
  await expect(page.getByRole('heading', { name: 'Your first workout', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: 'About the demo journal' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Your first workout', exact: true })).toBeVisible();
});
