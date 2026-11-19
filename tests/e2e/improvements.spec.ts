import { expect, test } from '@playwright/test';

test('demo visitors can start a clean personal journal and keep that workspace on their next visit', async ({ page }) => {
  await page.goto('./#dashboard');
  await expect(page.getByRole('region', { name: 'About the demo journal' })).toBeVisible();
  await page.getByRole('button', { name: 'Use my journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your first workout' })).toBeVisible();
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
