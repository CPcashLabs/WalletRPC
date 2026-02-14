import { afterEach, describe, expect, it, vi } from 'vitest';
import { TronService } from '../../services/tronService';

const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945382d7f9e9955f5d5f8d6f2ad4d9c7cb4d95';
const HEX_TRON_ADDR = `0x41${'1'.repeat(40)}`;

describe('TronService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('地址校验可以拦截明显非法输入', () => {
    expect(TronService.isValidBase58Address('not-an-address')).toBe(false);
    expect(TronService.isValidBase58Address('T123')).toBe(false);
  });

  it('toHexAddress 对非法地址返回空串', () => {
    expect(TronService.toHexAddress('abc')).toBe('');
    expect(TronService.toHexAddress('')).toBe('');
  });

  it('getBalance 使用标准 endpoint 并解析 bigint 余额', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      json: async () => ({ balance: 123456 })
    } as Response);

    const result = await TronService.getBalance('https://nile.trongrid.io/', HEX_TRON_ADDR);
    expect(result).toBe(123456n);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://nile.trongrid.io/wallet/getaccount',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getBalance 会将 /jsonrpc 形式的 host 归一化为 REST base', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      json: async () => ({ balance: 1 })
    } as Response);

    await TronService.getBalance('https://nile.trongrid.io/jsonrpc', HEX_TRON_ADDR);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://nile.trongrid.io/wallet/getaccount',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getTRC20Balance 解析 constant_result 并返回 bigint', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      json: async () => ({ constant_result: ['00000000000000000000000000000000000000000000000000000000000003e8'] })
    } as Response);

    const result = await TronService.getTRC20Balance('https://nile.trongrid.io', HEX_TRON_ADDR, HEX_TRON_ADDR);
    expect(result).toBe(1000n);
  });

  it('getTransactionInfo 正确识别未上链与成功状态', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({})
    } as Response);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ receipt: { result: 'SUCCESS' } })
    } as Response);

    const notFound = await TronService.getTransactionInfo('https://nile.trongrid.io', '0x1');
    const found = await TronService.getTransactionInfo('https://nile.trongrid.io', '0x2');

    expect(notFound).toEqual({ found: false });
    expect(found).toEqual({ found: true, success: true });
  });

  it('getTransactionInfo 在 receipt 非 SUCCESS 时返回失败状态', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      json: async () => ({ receipt: { result: 'OUT_OF_ENERGY' } })
    } as Response);

    const failed = await TronService.getTransactionInfo('https://nile.trongrid.io', '0x3');
    expect(failed).toEqual({ found: true, success: false });
  });

  it('sendTransaction 原生转账成功路径返回 txid', async () => {
    vi.spyOn(TronService, 'addressFromPrivateKey').mockReturnValue(HEX_TRON_ADDR);
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ txID: 'a'.repeat(64) })
    } as Response);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ result: true })
    } as Response);

    const result = await TronService.sendTransaction(
      'https://nile.trongrid.io/',
      TEST_PRIVATE_KEY,
      HEX_TRON_ADDR,
      1000n
    );

    expect(result).toEqual({ success: true, txid: 'a'.repeat(64) });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://nile.trongrid.io/wallet/createtransaction',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://nile.trongrid.io/wallet/broadcasttransaction',
      expect.any(Object)
    );
  });

  it('sendTransaction 对超出安全整数的原生金额进行拦截', async () => {
    vi.spyOn(TronService, 'addressFromPrivateKey').mockReturnValue(HEX_TRON_ADDR);
    const result = await TronService.sendTransaction(
      'https://nile.trongrid.io',
      TEST_PRIVATE_KEY,
      HEX_TRON_ADDR,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('safe integer');
  });

  it('sendTransaction 在 TRC20 trigger 失败时返回错误', async () => {
    vi.spyOn(TronService, 'addressFromPrivateKey').mockReturnValue(HEX_TRON_ADDR);
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ result: { result: false, message: 'trigger failed' } })
    } as Response);

    const result = await TronService.sendTransaction(
      'https://nile.trongrid.io',
      TEST_PRIVATE_KEY,
      HEX_TRON_ADDR,
      1n,
      HEX_TRON_ADDR
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('trigger failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
