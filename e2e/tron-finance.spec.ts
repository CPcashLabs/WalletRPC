import { expect, test } from '@playwright/test';
import { installBttcRpcMock } from './helpers/evmRpcMock';
import { installTronNileRpcMock } from './helpers/tronRpcMock';

const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

test('TRON Finance 页面可进入并展示关键模块（Nile）', async ({ page }) => {
  await installBttcRpcMock(page);
  await installTronNileRpcMock(page);

  await page.goto('/?e2e=1');
  await page.getByPlaceholder('Private Key / Mnemonic').fill(TEST_MNEMONIC);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('button', { name: /KILL_SIG|结束会话/i })).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'open-network-settings' }).click();
  await page.locator('select').first().selectOption({ label: 'Tron Nile Testnet' });
  await page.getByRole('button', { name: /SAVE CHANGES|保存更改/i }).click();

  await page.getByRole('button', { name: 'TRON Finance' }).click();
  await expect(page.getByRole('heading', { name: 'TRON Finance' })).toBeVisible();
  await expect(page.getByText(/资源总览/)).toBeVisible();
  await expect(page.getByText(/投票资源/)).toBeVisible();

  await page.getByRole('button', { name: '闭环快捷' }).click();
  await expect(page.getByText(/1\.\s*领取奖励/)).toBeVisible();
  await expect(page.getByText(/2\.\s*追加质押/)).toBeVisible();
  await expect(page.getByText(/3\.\s*平均再投票/)).toBeVisible();
});

