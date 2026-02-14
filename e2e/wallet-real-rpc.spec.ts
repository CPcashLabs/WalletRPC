import { expect, test } from '@playwright/test';

const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

test.describe('Wallet Flow (Real RPC Smoke)', () => {
  test.skip(!process.env.E2E_REAL_RPC, 'Set E2E_REAL_RPC=1 to run real RPC smoke tests.');

  test('can import wallet and reach dashboard with real RPC', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByPlaceholder('Private Key / Mnemonic').fill(TEST_MNEMONIC);
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('button', { name: /KILL_SIG|结束会话/i })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Total Net Worth|资产总净值/i)).toBeVisible({ timeout: 30000 });
  });
});
