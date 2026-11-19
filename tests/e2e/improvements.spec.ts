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
