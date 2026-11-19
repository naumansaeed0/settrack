import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

const emptyBackup = JSON.stringify({ app: 'settrack', version: 2, journal: { routines: [], history: [], draft: null } });
const backupFile = (content: string) => ({ name: 'journal.json', mimeType: 'application/json', buffer: Buffer.from(content) });

test('backup import validates data, confirms overwrite and exports the whole journal', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Training log' })).toBeVisible();
  const input = page.getByLabel('Import journal', { exact: true });
  await input.setInputFiles(backupFile('{bad'));
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
  await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
  await input.setInputFiles(backupFile(emptyBackup));
  await page.getByRole('button', { name: 'Cancel import' }).click();
  await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export journal' }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.version).toBe(2);
  expect(exported.journal.history).toHaveLength(9);
  expect(exported.journal.routines).toHaveLength(2);
  await input.setInputFiles(backupFile(emptyBackup));
  await page.getByRole('button', { name: 'Replace journal' }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your first workout' })).toBeVisible();
  await input.setInputFiles(backupFile(JSON.stringify(exported)));
  await page.getByRole('button', { name: 'Replace journal' }).click();
  await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
});

test('past workouts and completed sets can be edited and deleted with confirmation', async ({ page }) => {
  await page.goto('./#history');
  await page.getByRole('button', { name: /Upper Body A.*12 sets/ }).first().click();
  await page.getByRole('button', { name: 'Edit workout' }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Corrected workout');
  const bench = page.getByRole('group', { name: 'Bench Press', exact: true });
  await bench.getByRole('spinbutton', { name: 'Set 1 kg', exact: true }).fill('65');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Delete Bench Press set 2', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog').getByText('65 kg × 8')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.reload();
  await page.getByRole('button', { name: /Corrected workout.*11 sets/ }).click();
  await page.getByRole('button', { name: 'Delete workout', exact: true }).click();
  await page.getByRole('button', { name: 'Keep workout', exact: true }).click();
  await page.getByRole('button', { name: 'Delete workout', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete workout', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.reload();
  await expect(page.getByRole('button', { name: /Corrected workout/ })).toHaveCount(0);
  await expect(page.getByText('8 completed workouts')).toBeVisible();
});

test('workspace units persist and pounds entries keep canonical kilograms', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByRole('combobox', { name: 'Weight units' }).selectOption('lb');
  const bench = page.getByRole('region', { name: 'Bench Press' });
  await expect(bench.getByText('Chest · Last session 132.28 lb × 8')).toBeVisible();
  await bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in lb' }).fill('110.23');
  await bench.getByRole('button', { name: 'Bench Press set 1 complete' }).click();
  await expect(page.getByRole('status')).toHaveText('Stored on this device');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Weight units' })).toHaveValue('lb');
  await page.getByRole('combobox', { name: 'Weight units' }).selectOption('kg');
  await expect(bench.getByRole('spinbutton', { name: 'Bench Press set 1 weight in kg' })).toHaveValue('50');
  await page.getByRole('combobox', { name: 'Weight units' }).selectOption('lb');
  await page.getByRole('button', { name: /Demo journal/ }).click();
  await page.getByRole('button', { name: /My journal/ }).click();
  await expect(page.getByRole('combobox', { name: 'Weight units' })).toHaveValue('kg');
  await expect(page.getByRole('heading', { name: 'Your first workout' })).toBeVisible();
});

test('storage unavailability and quota failures show actionable errors', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('IndexedDB is unavailable');
});

test('quota errors preserve the unsaved journal for export', async ({ page }) => {
  await page.addInitScript(() => {
    IDBObjectStore.prototype.put = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('quota exceeded');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export journal' }).click();
  const exported = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8'));
  expect(exported.journal.draft.name).toBe('Upper Body A');
});

test('rest alert and wake lock recover gracefully through a workout', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { requests: 0, releases: 0, vibrations: 0, sounds: 0 };
    Object.defineProperty(window, 'AudioContext', { value: class {
      state = 'running'; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
      createOscillator() { return { connect() {}, frequency: { value: 0 }, start() { state.sounds++; }, stop() {} }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    } });
    Object.assign(window, { deviceState: state });
    Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => {
      state.requests++;
      const lock = Object.assign(new EventTarget(), { released: false, release: async () => { lock.released = true; state.releases++; lock.dispatchEvent(new Event('release')); } });
      return lock;
    } } });
    Object.defineProperty(navigator, 'vibrate', { value: () => { state.vibrations++; return true; } });
  });
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await expect(page.getByText('Screen stays awake while this workout is active and visible.')).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Rest duration in seconds' }).fill('5');
  await page.getByRole('button', { name: 'Start 5s', exact: true }).click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.clock.runFor(5100);
  await expect(page.getByRole('alert')).toContainText('Rest finished');
  expect(await page.evaluate(() => (window as unknown as {deviceState: {vibrations: number}}).deviceState.vibrations)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as {deviceState: {sounds: number}}).deviceState.sounds)).toBe(1);
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {deviceState: {releases: number}}).deviceState.releases)).toBe(1);
});

test('manifest icons dark theme and all interactive workout controls meet phone sizing', async ({ page, request }) => {
  const manifest = await (await request.get('./manifest.webmanifest')).json();
  expect(manifest.start_url).toBe('/settrack/');
  expect(manifest.icons.map((i: {sizes: string}) => i.sizes)).toEqual(['192x192', '512x512']);
  for (const icon of manifest.icons) {
    expect(icon.purpose).toContain('maskable');
    const response = await request.get(`./${icon.src}`);
    expect(response.ok()).toBeTruthy();
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(Number(icon.sizes.split('x')[0]));
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  expect(await page.locator('html').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(23, 27, 32)');
  const undersized = await page.locator('button, input, select').evaluateAll(elements => elements.filter(e => {
    const rect = e.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
  }).map(e => e.getAttribute('aria-label') || e.textContent));
  expect(undersized).toEqual([]);
  await page.screenshot({ path: 'test-results/dark-workout.png', fullPage: true });
});

test('a new worker waits for consent then replaces the old offline shell without losing data', async ({ page, context }) => {
  let generation = 'old';
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url!, 'http://localhost').pathname;
      const file = pathname === '/settrack/' ? 'index.html' : pathname.replace(/^\/settrack\//, '');
      if (file.includes('..') || file.startsWith('/')) { res.writeHead(404).end(); return; }
      let body: string | Buffer = await readFile(join(process.cwd(), 'dist', file));
      if (file === 'sw.js') body = body.toString().replace(/const version = "[^"]+";/, `const version = "test-${generation}";`);
      const extension = file.split('.').pop();
      const mime: Record<string,string> = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', webmanifest: 'application/manifest+json', png: 'image/png', webp: 'image/webp' };
      res.writeHead(200, { 'Content-Type': mime[extension!] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address() as { port: number };
    await page.goto(`http://127.0.0.1:${address.port}/settrack/`);
    await page.getByRole('button', { name: 'Start workout', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Stored on this device');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    generation = 'new';
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect(page.getByRole('button', { name: 'Update and reload' })).toBeVisible();
    await page.getByRole('button', { name: 'Update and reload' }).click();
    await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update and reload' })).toHaveCount(0);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(k => k.endsWith('test-new')))).toBe(true);
    expect(await page.evaluate(async () => (await caches.keys()).some(k => k.endsWith('test-old')))).toBe(false);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});


test('denied wake lock and persistent storage retain a usable journal', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { throw new Error('Denied'); } } });
    Object.defineProperty(navigator.storage, 'persist', { value: async () => false });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await expect(page.getByText('Keep-awake could not start. Your screen may lock during training.')).toBeVisible();
  await expect(page.getByText('Your browser may clear this journal under storage pressure. Export backups regularly.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upper Body A' })).toBeVisible();
});
