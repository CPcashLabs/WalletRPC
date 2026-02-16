import type { Page } from '@playwright/test';

const TRON_NILE_HOST = 'nile.trongrid.io';

export const installTronNileRpcMock = async (page: Page) => {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (!url.includes(TRON_NILE_HOST)) {
      await route.continue();
      return;
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      });
      return;
    }

    if (request.method() !== 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    const path = new URL(url).pathname.toLowerCase();
    if (path.endsWith('/wallet/getaccountresource')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          EnergyLimit: 5000,
          EnergyUsed: 800,
          freeNetLimit: 5000,
          freeNetUsed: 600,
          NetLimit: 2000,
          NetUsed: 300,
          tronPowerLimit: 10,
          tronPowerUsed: 4
        })
      });
      return;
    }

    if (path.endsWith('/wallet/getreward')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reward: 0 })
      });
      return;
    }

    if (path.endsWith('/wallet/getaccount')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 12345678,
          votes: [
            {
              vote_address: '4194f24e992ca04b49c6f2a2753076ef8938ed4daa',
              vote_count: 4
            }
          ]
        })
      });
      return;
    }

    if (path.endsWith('/wallet/listwitnesses')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          witnesses: [
            { address: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn', url: 'https://witness-a.example' },
            { address: 'TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp', url: 'https://witness-b.example' }
          ]
        })
      });
      return;
    }

    if (path.endsWith('/wallet/triggerconstantcontract')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          constant_result: ['00000000000000000000000000000000000000000000000000000000000f4240']
        })
      });
      return;
    }

    if (path.endsWith('/wallet/gettransactioninfobyid') || path.endsWith('/walletsolidity/gettransactioninfobyid')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ receipt: { result: 'SUCCESS' }, blockNumber: 123456 })
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
};

