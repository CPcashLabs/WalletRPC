import type { Page, Route } from '@playwright/test';
import { keccak256 } from 'ethers';

const BTTC_RPC_HOST = 'rpc.bittorrentchain.io';
const MOCK_TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MOCK_BLOCK_HASH = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const MOCK_PARENT_HASH = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
const MOCK_ROOT = '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
const MOCK_ROOT2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const MOCK_ROOT3 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const toRpcResponse = (id: unknown, result: unknown) => ({
  jsonrpc: '2.0',
  id,
  result
});

const resolveMethod = (method: string, params: any[]): any => {
  switch (method) {
    case 'eth_chainId':
      return '0xc7'; // 199
    case 'net_version':
      return '199';
    case 'eth_blockNumber':
      return '0x2';
    case 'eth_getBalance':
      return '0xde0b6b3a7640000'; // 1e18
    case 'eth_getTransactionCount':
      return '0x1';
    case 'eth_getCode':
      return '0x';
    case 'eth_call':
      return '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'; // token balance = 1e18
    case 'eth_gasPrice':
      return '0x3b9aca00'; // 1 gwei
    case 'eth_maxPriorityFeePerGas':
      return '0x77359400'; // 2 gwei
    case 'eth_feeHistory':
      return {
        oldestBlock: '0x1',
        baseFeePerGas: ['0x3b9aca00', '0x3b9aca00'],
        gasUsedRatio: [0.5],
        reward: [['0x77359400']]
      };
    case 'eth_getBlockByNumber':
      return {
        number: '0x2',
        hash: MOCK_BLOCK_HASH,
        parentHash: MOCK_PARENT_HASH,
        nonce: '0x0000000000000000',
        sha3Uncles: MOCK_ROOT,
        logsBloom: `0x${'0'.repeat(512)}`,
        transactionsRoot: MOCK_ROOT2,
        stateRoot: MOCK_ROOT3,
        receiptsRoot: MOCK_ROOT,
        miner: '0x0000000000000000000000000000000000000000',
        difficulty: '0x0',
        totalDifficulty: '0x0',
        extraData: '0x',
        size: '0x1',
        gasLimit: '0x1c9c380',
        gasUsed: '0x5208',
        timestamp: '0x5',
        transactions: [],
        uncles: [],
        baseFeePerGas: '0x3b9aca00'
      };
    case 'eth_estimateGas':
      return '0x5208'; // 21000
    case 'eth_sendRawTransaction':
      if (typeof params?.[0] === 'string' && params[0].startsWith('0x')) {
        return keccak256(params[0]);
      }
      return MOCK_TX_HASH;
    case 'eth_getTransactionReceipt':
      return {
        transactionHash: params?.[0] || MOCK_TX_HASH,
        blockNumber: '0x2',
        status: '0x1'
      };
    default:
      return '0x1';
  }
};

const fulfillRpc = async (route: Route, body: any) => {
  if (Array.isArray(body)) {
    const response = body.map((item) => {
      const method = String(item?.method || '');
      return toRpcResponse(item?.id, resolveMethod(method, item?.params || []));
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
    return;
  }

  const method = String(body?.method || '');
  const response = toRpcResponse(body?.id, resolveMethod(method, body?.params || []));
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
};

export const installBttcRpcMock = async (page: Page) => {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (!url.includes(BTTC_RPC_HOST)) {
      await route.continue();
      return;
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      });
      return;
    }

    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    try {
      const body = request.postDataJSON();
      await fulfillRpc(route, body);
    } catch {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(toRpcResponse(1, '0x1')) });
    }
  });
};
