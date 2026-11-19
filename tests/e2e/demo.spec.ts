import { expect, test } from '@playwright/test';

test('the guided flow works offline after a reload and updates lift progress', async ({ page, context }, info) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Training overview' })).toBeVisible();
  await page.screenshot({ path: `test-results/showcase/${info.project.name}-overview.png`, fullPage: true });
  await page.getByRole('button', { name: 'Start workout' }).click();
  const bench = page.getByRole('region', { name: 'Bench Press' });
  await expect(bench.getByText('Chest · Last workout 60 kg × 8')).toBeVisible();
  await bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' }).fill('62.5');
  await bench.getByRole('button', { name: 'Bench Press set 1 complete' }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' })).toHaveValue('62.5');
  await expect(bench.getByRole('button', { name: 'Bench Press set 1 undo' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `test-results/showcase/${info.project.name}-workout.png`, fullPage: info.project.name === 'desktop' });
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('button', { name: 'Save workout' }).click();
  const summary = page.getByRole('dialog');
  await expect(summary.getByText('New heaviest set')).toBeVisible();
  await expect(summary.getByText('Bench Press · 62.5 kg')).toBeVisible();
  await summary.getByRole('button', { name: 'View progress' }).click();
  await page.getByText('Workout data').click();
  await expect(page.getByRole('cell', { name: '62.5 kg' })).toBeVisible();
});

test('a personal routine saves independently of the demo workspace', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /demo journal/i }).click();
  await page.getByRole('button', { name: /^my journal/i }).click();
  await expect(page.getByRole('heading', { name: 'Your first workout', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Routines', exact: true }).click();
  await page.getByRole('button', { name: 'New routine', exact: true }).click();
  await page.getByLabel('Routine name').fill('Leg Day');
  await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('squat');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Save routine' }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible();
  await page.getByRole('button', { name: /^my journal/i }).click();
  await page.getByRole('button', { name: /demo journal/i }).click();
  await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
});


test('history deep link survives online and offline reloads', async ({ page, context }) => {
  await page.goto('./#history');
  await expect(page.getByRole('heading', { name: 'Workout history' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workout history' })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workout history' })).toBeVisible();
});
