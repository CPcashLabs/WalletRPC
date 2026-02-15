import { expect, test } from '@playwright/test';
import { installBttcRpcMock } from './helpers/evmRpcMock';

const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

test('Console dock should float across views and be expandable', async ({ page }) => {
  await installBttcRpcMock(page);
  await page.goto('/?e2e=1');
  await page.getByPlaceholder('Private Key / Mnemonic').fill(TEST_MNEMONIC);
  await page.getByRole('button', { name: /Confirm|确认/i }).click();
  await expect(page.getByRole('button', { name: /KILL_SIG|结束会话/i })).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'open-network-settings' }).click();
  await page.getByRole('button', { name: 'open-console' }).click();

  // Expanded console should appear.
  await expect(page.getByText(/Console|控制台/)).toBeVisible();

  // Minimize -> dock line should appear.
  await page.getByRole('button', { name: 'console-minimize' }).click();
  await expect(page.getByRole('button', { name: 'http-console-fab' })).toBeVisible();

  // Expand again from dock.
  await page.getByRole('button', { name: 'http-console-fab' }).click();
  await expect(page.getByText(/Console|控制台/)).toBeVisible();
});
