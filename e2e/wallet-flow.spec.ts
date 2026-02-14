import { expect, test } from '@playwright/test';
import { installBttcRpcMock } from './helpers/evmRpcMock';

const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

const importToDashboard = async (page: import('@playwright/test').Page) => {
  await installBttcRpcMock(page);
  await page.goto('/?e2e=1');
  await page.getByPlaceholder('Private Key / Mnemonic').fill(TEST_MNEMONIC);
  await page.getByRole('button', { name: 'Confirm' }).click();
  try {
    await expect(page.getByRole('button', { name: /KILL_SIG|结束会话/i })).toBeVisible({ timeout: 20000 });
  } catch (e) {
    const body = (await page.textContent('body')) || '';
    throw new Error(`未进入主应用视图。页面片段: ${body.slice(0, 400)}`);
  }
};

test.describe('Wallet Flow (Mocked RPC)', () => {
  test('导入后进入 Dashboard 并可切换到发送页', async ({ page }) => {
    await importToDashboard(page);

    await expect(page.getByText(/Total Net Worth|资产总净值/)).toBeVisible();
    await expect(page.locator('button', { hasText: /SEND|发送/i }).first()).toBeVisible();

    await page.locator('button', { hasText: /SEND|发送/i }).first().click();
    await expect(page.getByText(/Broadcast Transaction|广播交易指令/)).toBeVisible();
    await expect(page.getByRole('button', { name: /BROADCAST_TRANSACTION|广播交易/i })).toBeDisabled();
  });

  test('发送流程可进入成功状态并返回 Dashboard', async ({ page }) => {
    await importToDashboard(page);
    await page.locator('button', { hasText: /SEND|发送/i }).first().click();

    await page.getByPlaceholder('0x...').fill('0x000000000000000000000000000000000000dEaD');
    await page.getByPlaceholder('0.0').fill('0.1');

    const sendBtn = page.getByRole('button', { name: /BROADCAST_TRANSACTION|广播交易/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    await expect(page.getByText(/Transmission Confirmed|传输已确认/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /RETURN_TO_BASE|返回主界面/ }).click();
    await expect(page.locator('button', { hasText: /SEND|发送/i }).first()).toBeVisible();
  });
});
