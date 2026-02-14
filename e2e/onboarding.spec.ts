import { expect, test } from '@playwright/test';

test.describe('Wallet RPC Onboarding', () => {
  test('支持语言切换并展示导入错误', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByPlaceholder('Private Key / Mnemonic')).toBeVisible();
    const confirmBtn = page.getByRole('button', { name: 'Confirm' });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();

    await page.getByRole('button', { name: '中文' }).click();
    const zhConfirm = page.getByRole('button', { name: '确认' });
    await expect(zhConfirm).toBeVisible();

    await page.getByPlaceholder('Private Key / Mnemonic').fill('invalid mnemonic');
    await expect(zhConfirm).toBeEnabled();
    await zhConfirm.click();
    await expect(page.getByText('Invalid Key/Mnemonic')).toBeVisible();
  });
});
