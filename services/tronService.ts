
import { ethers } from 'ethers';
import bs58 from 'bs58';
import { devError } from './logger';
import { TronResourceType } from '../features/wallet/types';
import { TRON_WITNESS_WHITELIST } from '../features/wallet/tronWitnessWhitelist';

const bytesToHex = (bytes: ArrayLike<number>): string => {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
};

const fetchWithTimeout = async (input: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try { controller.abort(); } catch { /* ignore */ }
      reject(new Error('Request timeout'));
    }, timeoutMs);
  });

  try {
    const req = fetch(input, { ...init, signal: controller.signal });
    return await Promise.race([req, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const IS_TEST_ENV = typeof process !== 'undefined' && !!(process.env.VITEST || process.env.NODE_ENV === 'test');
const TRONGRID_BASE_INTERVAL_MS = IS_TEST_ENV ? 1 : 220;
const TRONGRID_MAX_INTERVAL_MS = IS_TEST_ENV ? 8 : 2000;
const TRONGRID_RECOVER_STEP_MS = IS_TEST_ENV ? 1 : 40;
const TRONGRID_MAX_429_RETRIES = 2;

const tronGridRateState = new Map<string, { nextAllowedAt: number; intervalMs: number }>();
const tronGridHostLocks = new Map<string, Promise<void>>();

const clearTronGridRateLimitState = () => {
  tronGridRateState.clear();
  tronGridHostLocks.clear();
};

const sleepMs = async (ms: number): Promise<void> => {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const parseHostFromUrl = (url: string): string => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '';
  }
};

const isTronGridHost = (host: string): boolean => {
  return host === 'api.trongrid.io' || host.endsWith('.trongrid.io');
};

const getTronGridRateState = (host: string): { nextAllowedAt: number; intervalMs: number } => {
  const existing = tronGridRateState.get(host);
  if (existing) return existing;
  const init = { nextAllowedAt: 0, intervalMs: TRONGRID_BASE_INTERVAL_MS };
  tronGridRateState.set(host, init);
  return init;
};

const acquireTronGridHostLock = async (host: string): Promise<() => void> => {
  while (tronGridHostLocks.has(host)) {
    await tronGridHostLocks.get(host);
  }
  let release!: () => void;
  const lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  tronGridHostLocks.set(host, lock);
  return () => {
    if (tronGridHostLocks.get(host) === lock) {
      tronGridHostLocks.delete(host);
    }
    release();
  };
};

const fetchWithTronGridRateLimit = async (input: string, init: RequestInit, timeoutMs: number) => {
  const host = parseHostFromUrl(input);
  if (!isTronGridHost(host)) {
    return await fetchWithTimeout(input, init, timeoutMs);
  }

  const release = await acquireTronGridHostLock(host);
  const rate = getTronGridRateState(host);
  try {
    const waitMs = Math.max(0, rate.nextAllowedAt - Date.now());
    if (waitMs > 0) await sleepMs(waitMs);

    for (let attempt = 0; attempt <= TRONGRID_MAX_429_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetchWithTimeout(input, init, timeoutMs);
      } catch (e) {
        rate.nextAllowedAt = Date.now() + rate.intervalMs;
        throw e;
      }

      if (res.status === 429) {
        rate.intervalMs = Math.min(TRONGRID_MAX_INTERVAL_MS, Math.max(rate.intervalMs * 2, TRONGRID_BASE_INTERVAL_MS));
        rate.nextAllowedAt = Date.now() + rate.intervalMs;
        if (attempt < TRONGRID_MAX_429_RETRIES) {
          await sleepMs(rate.intervalMs);
          continue;
        }
        return res;
      }

      rate.intervalMs = Math.max(TRONGRID_BASE_INTERVAL_MS, rate.intervalMs - TRONGRID_RECOVER_STEP_MS);
      rate.nextAllowedAt = Date.now() + rate.intervalMs;
      return res;
    }

    throw new Error('Unexpected retry loop termination');
  } finally {
    release();
  }
};

const postJson = async <T>(url: string, body: unknown, timeoutMs: number = 8000): Promise<T> => {
  const res = await fetchWithTronGridRateLimit(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    timeoutMs
  );
  if (!res.ok) {
    throw new HttpStatusError(res.status);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
};

class HttpStatusError extends Error {
  status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

const postJsonFirstSuccess = async <T>(
  requests: Array<{ url: string; body: unknown; timeoutMs?: number }>,
  options?: { stopOnStatusCodes?: number[] }
): Promise<T> => {
  const stopOnStatusCodes = new Set(options?.stopOnStatusCodes || []);
  let lastError: unknown = null;
  for (const req of requests) {
    try {
      return await postJson<T>(req.url, req.body, req.timeoutMs);
    } catch (e) {
      lastError = e;
      if (e instanceof HttpStatusError && stopOnStatusCodes.has(e.status)) {
        throw e;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All endpoint attempts failed');
};

type TronTxResult = { success: boolean; txid?: string; error?: string };

const toTxPayload = (raw: any): any => {
  if (!raw) throw new Error('Empty transaction payload');
  if (raw.transaction) return raw.transaction;
  if (raw.txID) return raw;
  throw new Error('Invalid transaction payload');
};

const parseApiError = (raw: any): string => {
  const msg = raw?.message || raw?.Error || raw?.code || 'Unknown error';
  const decoded = tryDecodeHexAscii(msg) || tryDecodeBase64Ascii(msg);
  return decoded || String(msg);
};

const TRON_CONTRACT_TYPES = {
  TRANSFER: 1,
  VOTE_WITNESS: 4,
  WITHDRAW_BALANCE: 13,
  TRIGGER_SMART_CONTRACT: 31,
  FREEZE_BALANCE_V2: 54,
  UNFREEZE_BALANCE_V2: 55,
  WITHDRAW_EXPIRE_UNFREEZE: 56
} as const;

const getPermissionFieldPayloads = (permissionId?: number): Array<Record<string, string | number>> => {
  if (!Number.isInteger(permissionId) || Number(permissionId) <= 0) return [{}];
  const id = Number(permissionId);
  return [
    { Permission_id: id },
    { permission_id: id },
    { Permission_id: String(id) },
    { permission_id: String(id) },
    { permissionId: id },
    { permissionId: String(id) },
    { Permission_id: id, permission_id: id }
  ];
};

const isPermissionMismatchError = (msg: unknown): boolean => {
  const s = String(msg || '').toLowerCase();
  if (!s) return false;
  return (
    s.includes('not contained of permission') ||
    s.includes('validate signature error') ||
    (s.includes('permission') && s.includes('sign'))
  );
};

const extractTransactionPermissionId = (raw: any): number | undefined => {
  const tx = raw?.transaction || raw;
  const contracts = tx?.raw_data?.contract;
  if (!Array.isArray(contracts) || contracts.length === 0) return undefined;
  const pid = contracts[0]?.Permission_id ?? contracts[0]?.permission_id ?? contracts[0]?.permissionId;
  const n = Number(pid);
  if (!Number.isInteger(n)) return undefined;
  return n;
};

const isPermissionApplied = (raw: any, permissionId?: number): boolean => {
  if (!Number.isInteger(permissionId) || Number(permissionId) <= 0) return true;
  return extractTransactionPermissionId(raw) === Number(permissionId);
};

const postJsonWithPermissionVariants = async <T>(
  url: string,
  body: Record<string, unknown>,
  permissionId?: number,
  timeoutMs?: number
): Promise<T> => {
  let lastError: unknown = null;
  let lastTx: T | null = null;
  for (const permFields of getPermissionFieldPayloads(permissionId)) {
    try {
      const tx = await postJson<T>(url, { ...body, ...permFields }, timeoutMs);
      lastTx = tx;
      if (isPermissionApplied(tx, permissionId)) return tx;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastTx) {
    throw new Error(`Permission id ${Number(permissionId)} was not applied by node`);
  }
  throw lastError ?? new Error('All permission variants failed');
};

const postJsonFirstSuccessWithPermissionVariants = async <T>(
  requests: Array<{ url: string; body: Record<string, unknown>; timeoutMs?: number }>,
  permissionId?: number,
  options?: { stopOnStatusCodes?: number[] }
): Promise<T> => {
  let lastError: unknown = null;
  let lastTx: T | null = null;
  for (const permFields of getPermissionFieldPayloads(permissionId)) {
    try {
      const tx = await postJsonFirstSuccess<T>(
        requests.map((r) => ({ ...r, body: { ...r.body, ...permFields } })),
        options
      );
      lastTx = tx;
      if (isPermissionApplied(tx, permissionId)) return tx;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastTx) {
    throw new Error(`Permission id ${Number(permissionId)} was not applied by node`);
  }
  throw lastError ?? new Error('All permission variants failed');
};

const normalizeTronAddressToHex41 = (input: unknown): string => {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.startsWith('T')) return TronService.toHexAddress(raw).replace(/^0x/i, '').toLowerCase();
  const hex = raw.replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{42}$/.test(hex) || !hex.toLowerCase().startsWith('41')) return '';
  return hex.toLowerCase();
};

const matchSignerWeight = (permission: any, signerHexLower: string): number => {
  const keys = Array.isArray(permission?.keys) ? permission.keys : [];
  let weight = 0;
  for (const key of keys) {
    const addr = normalizeTronAddressToHex41(key?.address);
    if (!addr || addr !== signerHexLower) continue;
    const w = Number(key?.weight || 0);
    if (Number.isFinite(w) && w > 0) weight += w;
  }
  return weight;
};

const permissionAllowsContractType = (operations: unknown, contractType: number): boolean | null => {
  if (typeof operations !== 'string' || !operations) return null;
  const hex = operations.replace(/^0x/i, '');
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const byteIndex = Math.floor(contractType / 8);
  const bitIndex = contractType % 8;
  if (byteIndex < 0 || byteIndex * 2 + 2 > hex.length) return false;
  const byteVal = parseInt(hex.slice(byteIndex * 2, byteIndex * 2 + 2), 16);
  return (byteVal & (1 << bitIndex)) !== 0;
};

const resolveActivePermissionIdForSigner = async (
  baseUrl: string,
  ownerAddress: string,
  contractType: number
): Promise<number | undefined> => {
  const signerHex = normalizeTronAddressToHex41(ownerAddress);
  if (!signerHex) return undefined;
  const ownerHex = signerHex;
  if (!ownerHex) return undefined;

  const account = await postJson<any>(`${baseUrl}/wallet/getaccount`, {
    address: ownerHex,
    visible: false
  });
  const activePermissions = Array.isArray(account?.active_permission)
    ? account.active_permission
    : Array.isArray(account?.active_permissions)
      ? account.active_permissions
      : [];
  if (!activePermissions.length) return undefined;

  const candidates: Array<{ id: number; allowByOps: boolean | null }> = [];
  for (const perm of activePermissions) {
    const id = Number(perm?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const threshold = Number(perm?.threshold || 1);
    if (!Number.isFinite(threshold) || threshold <= 0) continue;
    const signerWeight = matchSignerWeight(perm, signerHex);
    if (signerWeight < threshold) continue;
    candidates.push({ id, allowByOps: permissionAllowsContractType(perm?.operations, contractType) });
  }
  if (!candidates.length) return undefined;

  candidates.sort((a, b) => a.id - b.id);
  const allowed = candidates.find((c) => c.allowByOps === true);
  if (allowed) return allowed.id;
  const unknown = candidates.find((c) => c.allowByOps === null);
  if (unknown) return unknown.id;
  return candidates[0].id;
};

const signAndBroadcastWithPermissionFallback = async (
  baseUrl: string,
  privateKey: string,
  ownerAddress: string,
  contractType: number,
  txPayload: any,
  rebuildTxWithPermission: (permissionId: number) => Promise<any>
): Promise<TronTxResult> => {
  const first = await signAndBroadcast(baseUrl, privateKey, txPayload);
  if (first.success || !isPermissionMismatchError(first.error)) return first;
  const firstMsg = first.error || 'Broadcast failed';

  try {
    const permissionId = await resolveActivePermissionIdForSigner(baseUrl, ownerAddress, contractType);
    if (!Number.isInteger(permissionId) || Number(permissionId) <= 0) {
      return { success: false, error: `${firstMsg} (no matching active permission found for signer)` };
    }
    const retryTx = await rebuildTxWithPermission(Number(permissionId));
    return await signAndBroadcast(baseUrl, privateKey, retryTx);
  } catch (e) {
    const retryMsg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `${firstMsg} (permission fallback failed: ${retryMsg})` };
  }
};

const signAndBroadcast = async (baseUrl: string, privateKey: string, txPayload: any): Promise<TronTxResult> => {
  const transaction = toTxPayload(txPayload);
  if (!transaction.txID) throw new Error('Missing txID');

  const signingKey = new ethers.SigningKey(privateKey);
  const signature = signingKey.sign(`0x${transaction.txID}`);
  const sigHex =
    signature.r.slice(2) + signature.s.slice(2) + (signature.v - 27).toString(16).padStart(2, '0');
  const signedTx = { ...transaction, signature: [sigHex] };
  const broadcastResult = await postJson<any>(`${baseUrl}/wallet/broadcasttransaction`, signedTx);

  if (broadcastResult.result) {
    return { success: true, txid: transaction.txID };
  }
  return { success: false, error: parseApiError(broadcastResult) };
};

const toResource = (resource: TronResourceType): 'ENERGY' | 'BANDWIDTH' => {
  return resource === 'ENERGY' ? 'ENERGY' : 'BANDWIDTH';
};

const toSafeAmountNumber = (amount: bigint): number => {
  const n = Number(amount);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new Error('Amount must be a positive safe integer');
  }
  return n;
};

const TRON_WITNESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const tronWitnessCache = new Map<
  string,
  {
    expiresAt: number;
    witnesses: Array<{ address: string; name: string; website?: string; description?: string; isActive: boolean }>;
  }
>();

const tryDecodeHexAscii = (s: unknown): string | null => {
  if (typeof s !== 'string') return null;
  const hex = s.startsWith('0x') ? s.slice(2) : s;
  if (!hex || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    const text = new TextDecoder().decode(bytes);
    // only accept printable-ish strings
    if (/^[\x09\x0A\x0D\x20-\x7E]{1,}$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
};

const tryDecodeBase64Ascii = (s: unknown): string | null => {
  if (typeof s !== 'string' || !s) return null;
  try {
    let bytes: Uint8Array;
    if (typeof atob === 'function') {
      const bin = atob(s);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else if (typeof Buffer !== 'undefined') {
      bytes = Uint8Array.from(Buffer.from(s, 'base64'));
    } else {
      return null;
    }
    const text = new TextDecoder().decode(bytes);
    if (/^[\x09\x0A\x0D\x20-\x7E]{1,}$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
};

const clearWitnessCache = () => {
  tronWitnessCache.clear();
};

const getWitnessCacheSize = () => {
  return tronWitnessCache.size;
};

/**
 * 【设计亮点：轻量级协议桥接器 (Adapter Pattern)】
 * 
 * 背景：Tron 与以太坊同为 EVM 兼容，但账户体系（Base58）与底层 RPC 差异极大。
 * 意义：本项目不使用庞大的 TronWeb 官方库，而是基于 ethers.js 基础加密包手动实现协议转换和交易签名。
 */
export const TronService = {
  normalizeHost: (host: string): string => {
    let baseUrl = (host || '').trim();
    if (!baseUrl) return '';

    // Normalize TronGrid JSON-RPC urls to the REST base used by this client.
    baseUrl = baseUrl.replace(/\/+$/, '');
    if (baseUrl.endsWith('/jsonrpc')) {
      baseUrl = baseUrl.slice(0, -'/jsonrpc'.length);
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    return baseUrl;
  },
  
  isValidBase58Address: (address: string): boolean => {
    try {
      if (typeof address !== 'string' || address.length !== 34 || !address.startsWith('T')) return false;
      const bytes = bs58.decode(address);
      if (bytes.length !== 25) return false;
      
      const payload = bytes.slice(0, 21);
      const checksum = bytes.slice(21);
      const firstHash = ethers.sha256(bytesToHex(payload));
      const hash = ethers.getBytes(ethers.sha256(firstHash));
      const expectedChecksum = hash.slice(0, 4);
      return checksum.every((val, i) => val === expectedChecksum[i]);
    } catch (e) { return false; }
  },

  /**
   * 获取 TRX 余额
   */
  getBalance: async (host: string, address: string): Promise<bigint> => {
    try {
      const baseUrl = TronService.normalizeHost(host);
      const account = await postJson<{ balance?: number | string }>(
        `${baseUrl}/wallet/getaccount`,
        {
          address: TronService.toHexAddress(address),
          visible: false
        }
      );
      return BigInt(account.balance || 0);
    } catch (e) { 
      devError("Tron getBalance failed", e);
      // Important: do not masquerade failures as 0 balance. Callers should handle the error
      // and decide whether to keep last-known values or show a loading/error state.
      throw e instanceof Error ? e : new Error(String(e));
    }
  },

  /**
   * 获取 TRC20 代币余额 (如 USDT)
   */
  getTRC20Balance: async (host: string, contractAddress: string, ownerAddress: string): Promise<bigint> => {
    try {
      const baseUrl = TronService.normalizeHost(host);
      const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
      const contractHex = TronService.toHexAddress(contractAddress).replace('0x', '');
      
      const parameter = ownerHex.padStart(64, '0');
      
      const result = await postJson<any>(`${baseUrl}/wallet/triggerconstantcontract`, {
        owner_address: ownerHex,
        contract_address: contractHex,
        function_selector: "balanceOf(address)",
        parameter: parameter,
        visible: false
      });
      if (result.constant_result && result.constant_result.length > 0) {
        return BigInt('0x' + result.constant_result[0]);
      }
      return 0n;
    } catch (e) {
      devError("TRC20 balance fetch failed", e);
      // Same reasoning as getBalance(): a fetch failure must not look like a real 0 balance.
      throw e instanceof Error ? e : new Error(String(e));
    }
  },

  getWitnessWhitelist: () => {
    return TRON_WITNESS_WHITELIST.filter((w) => w.isActive);
  },

  getNodeWitnesses: async (
    host: string
  ): Promise<Array<{ address: string; name: string; website?: string; description?: string; isActive: boolean }>> => {
    const baseUrl = TronService.normalizeHost(host);
    const now = Date.now();
    const cached = tronWitnessCache.get(baseUrl);
    if (cached && cached.expiresAt > now) {
      return cached.witnesses;
    }
    try {
      const data = await postJsonFirstSuccess<any>(
        [
          { url: `${baseUrl}/wallet/listwitnesses`, body: {} },
          { url: `${baseUrl}/wallet/listWitnesses`, body: {} }
        ],
        // 对 429 不继续做大小写端点回退，避免触发额外同类请求。
        { stopOnStatusCodes: [429] }
      );
      const list = Array.isArray(data?.witnesses) ? data.witnesses : [];
      const witnesses = list
        .map((w: any) => {
          const rawAddr = String(w?.address || '');
          const addr = rawAddr.startsWith('T')
            ? rawAddr
            : TronService.fromHexAddress(`0x${rawAddr.replace(/^0x/i, '')}`);
          const url = typeof w?.url === 'string' ? w.url : '';
          const label = url || `${addr.slice(0, 6)}...${addr.slice(-4)}`;
          return {
            address: addr,
            name: label,
            website: url || undefined,
            description: 'RPC witness list',
            isActive: true
          };
        })
        .filter((w: any) => TronService.isValidBase58Address(w.address));
      if (witnesses.length > 0) {
        tronWitnessCache.set(baseUrl, {
          expiresAt: now + TRON_WITNESS_CACHE_TTL_MS,
          witnesses
        });
      }
      return witnesses;
    } catch (e) {
      devError('TRON getNodeWitnesses failed', e);
      if (cached?.witnesses?.length) return cached.witnesses;
      return [];
    }
  },

  getAccountResources: async (
    host: string,
    address: string
  ): Promise<{
    energyLimit: number;
    energyUsed: number;
    freeNetLimit: number;
    freeNetUsed: number;
    netLimit: number;
    netUsed: number;
    tronPowerLimit: number;
    tronPowerUsed: number;
  }> => {
    const baseUrl = TronService.normalizeHost(host);
    const result = await postJson<any>(`${baseUrl}/wallet/getaccountresource`, {
      address: TronService.toHexAddress(address),
      visible: false
    });
    return {
      energyLimit: Number(result?.EnergyLimit || 0),
      energyUsed: Number(result?.EnergyUsed || 0),
      freeNetLimit: Number(result?.freeNetLimit || 0),
      freeNetUsed: Number(result?.freeNetUsed || 0),
      netLimit: Number(result?.NetLimit || 0),
      netUsed: Number(result?.NetUsed || 0),
      tronPowerLimit: Number(result?.tronPowerLimit || 0),
      tronPowerUsed: Number(result?.tronPowerUsed || 0)
    };
  },

  getCanWithdrawUnfreeze: async (host: string, address: string): Promise<bigint> => {
    const baseUrl = TronService.normalizeHost(host);
    try {
      const result = await postJson<any>(`${baseUrl}/wallet/getcanwithdrawunfreezeamount`, {
        owner_address: TronService.toHexAddress(address).replace('0x', ''),
        visible: false
      });
      return BigInt(result?.amount || 0);
    } catch (e) {
      devError('TRON getCanWithdrawUnfreeze failed', e);
      return 0n;
    }
  },

  stakeResource: async (
    host: string,
    privateKey: string,
    amountSun: bigint,
    resource: TronResourceType
  ): Promise<TronTxResult> => {
    const baseUrl = TronService.normalizeHost(host);
    const ownerAddress = TronService.addressFromPrivateKey(privateKey);
    const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
    if (!ownerHex) return { success: false, error: 'Invalid owner address' };
    try {
      const buildTx = async (permissionId?: number) => {
        const tx = await postJsonWithPermissionVariants<any>(`${baseUrl}/wallet/freezebalancev2`, {
          owner_address: ownerHex,
          frozen_balance: toSafeAmountNumber(amountSun),
          resource: toResource(resource),
          visible: false
        }, permissionId);
        if (tx?.result?.result === false) throw new Error(parseApiError(tx));
        return tx;
      };
      const tx = await buildTx();
      return await signAndBroadcastWithPermissionFallback(
        baseUrl,
        privateKey,
        ownerAddress,
        TRON_CONTRACT_TYPES.FREEZE_BALANCE_V2,
        tx,
        async (permissionId) => buildTx(permissionId)
      );
    } catch (e: any) {
      devError('TRON stakeResource failed', e);
      return { success: false, error: e?.message || 'stake failed' };
    }
  },

  unstakeResource: async (
    host: string,
    privateKey: string,
    amountSun: bigint,
    resource: TronResourceType
  ): Promise<TronTxResult> => {
    const baseUrl = TronService.normalizeHost(host);
    const ownerAddress = TronService.addressFromPrivateKey(privateKey);
    const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
    if (!ownerHex) return { success: false, error: 'Invalid owner address' };
    try {
      const buildTx = async (permissionId?: number) => {
        const tx = await postJsonWithPermissionVariants<any>(`${baseUrl}/wallet/unfreezebalancev2`, {
          owner_address: ownerHex,
          unfreeze_balance: toSafeAmountNumber(amountSun),
          resource: toResource(resource),
          visible: false
        }, permissionId);
        if (tx?.result?.result === false) throw new Error(parseApiError(tx));
        return tx;
      };
      const tx = await buildTx();
      return await signAndBroadcastWithPermissionFallback(
        baseUrl,
        privateKey,
        ownerAddress,
        TRON_CONTRACT_TYPES.UNFREEZE_BALANCE_V2,
        tx,
        async (permissionId) => buildTx(permissionId)
      );
    } catch (e: any) {
      devError('TRON unstakeResource failed', e);
      return { success: false, error: e?.message || 'unstake failed' };
    }
  },

  withdrawUnfreeze: async (host: string, privateKey: string): Promise<TronTxResult> => {
    const baseUrl = TronService.normalizeHost(host);
    const ownerAddress = TronService.addressFromPrivateKey(privateKey);
    const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
    if (!ownerHex) return { success: false, error: 'Invalid owner address' };
    try {
      const buildTx = async (permissionId?: number) => {
        const tx = await postJsonWithPermissionVariants<any>(`${baseUrl}/wallet/withdrawexpireunfreeze`, {
          owner_address: ownerHex,
          visible: false
        }, permissionId);
        if (tx?.result?.result === false) throw new Error(parseApiError(tx));
        return tx;
      };
      const tx = await buildTx();
      return await signAndBroadcastWithPermissionFallback(
        baseUrl,
        privateKey,
        ownerAddress,
        TRON_CONTRACT_TYPES.WITHDRAW_EXPIRE_UNFREEZE,
        tx,
        async (permissionId) => buildTx(permissionId)
      );
    } catch (e: any) {
      devError('TRON withdrawUnfreeze failed', e);
      return { success: false, error: e?.message || 'withdraw unfreeze failed' };
    }
  },

  voteWitnesses: async (
    host: string,
    privateKey: string,
    votes: Array<{ address: string; votes: number }>
  ): Promise<TronTxResult> => {
    const baseUrl = TronService.normalizeHost(host);
    const ownerAddress = TronService.addressFromPrivateKey(privateKey);
    const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
    if (!ownerHex) return { success: false, error: 'Invalid owner address' };
    const normalizedVotesHex = votes
      .filter((v) => Number.isFinite(v.votes) && v.votes > 0)
      .map((v) => ({
        vote_address: TronService.toHexAddress(v.address).replace('0x', ''),
        vote_count: Math.floor(v.votes)
      }))
      .filter((v) => !!v.vote_address && v.vote_count > 0);
    const normalizedVotesBase58 = votes
      .filter((v) => Number.isFinite(v.votes) && v.votes > 0)
      .map((v) => ({
        vote_address: v.address,
        vote_count: Math.floor(v.votes)
      }))
      .filter((v) => TronService.isValidBase58Address(v.vote_address) && v.vote_count > 0);
    if (normalizedVotesHex.length === 0) return { success: false, error: 'Vote count must be greater than 0' };
    try {
      const buildTx = async (permissionId?: number) => {
        const tx = await postJsonFirstSuccessWithPermissionVariants<any>([
          {
            url: `${baseUrl}/wallet/votewitnessaccount`,
            body: {
              owner_address: ownerHex,
              votes: normalizedVotesHex,
              visible: false
            }
          },
          {
            url: `${baseUrl}/wallet/votewitnessaccount`,
            body: {
              owner_address: ownerAddress,
              votes: normalizedVotesBase58,
              visible: true
            }
          }
        ], permissionId);
        if (tx?.result?.result === false) throw new Error(parseApiError(tx));
        return tx;
      };
      const tx = await buildTx();
      return await signAndBroadcastWithPermissionFallback(
        baseUrl,
        privateKey,
        ownerAddress,
        TRON_CONTRACT_TYPES.VOTE_WITNESS,
        tx,
        async (permissionId) => buildTx(permissionId)
      );
    } catch (e: any) {
      devError('TRON voteWitnesses failed', e);
      return { success: false, error: e?.message || 'vote failed' };
    }
  },

  getVoteStatus: async (
    host: string,
    address: string
  ): Promise<Array<{ address: string; votes: number }>> => {
    const baseUrl = TronService.normalizeHost(host);
    try {
      const account = await postJson<any>(`${baseUrl}/wallet/getaccount`, {
        address: TronService.toHexAddress(address),
        visible: false
      });
      const votes = Array.isArray(account?.votes) ? account.votes : [];
      return votes
        .map((v: any) => ({
          address: TronService.fromHexAddress(`0x${String(v?.vote_address || '')}`),
          votes: Number(v?.vote_count || 0)
        }))
        .filter((v: any) => !!v.address && Number.isFinite(v.votes));
    } catch (e) {
      devError('TRON getVoteStatus failed', e);
      return [];
    }
  },

  getRewardInfo: async (
    host: string,
    address: string
  ): Promise<{ claimableSun: bigint; canClaim: boolean }> => {
    const baseUrl = TronService.normalizeHost(host);
    try {
      const hexAddress = TronService.toHexAddress(address).replace('0x', '');
      const result = await postJsonFirstSuccess<any>([
        {
          url: `${baseUrl}/wallet/getReward`,
          body: { address: hexAddress, visible: false }
        },
        {
          url: `${baseUrl}/wallet/getReward`,
          body: { owner_address: hexAddress, visible: false }
        },
        {
          url: `${baseUrl}/wallet/getReward`,
          body: { address, visible: true }
        }
      ]);
      const reward = BigInt(result?.reward || 0);
      return { claimableSun: reward, canClaim: reward > 0n };
    } catch (e) {
      devError('TRON getRewardInfo failed', e);
      return { claimableSun: 0n, canClaim: false };
    }
  },

  claimReward: async (host: string, privateKey: string): Promise<TronTxResult> => {
    const baseUrl = TronService.normalizeHost(host);
    const ownerAddress = TronService.addressFromPrivateKey(privateKey);
    const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
    if (!ownerHex) return { success: false, error: 'Invalid owner address' };
    try {
      const buildTx = async (permissionId?: number) => {
        const tx = await postJsonWithPermissionVariants<any>(`${baseUrl}/wallet/withdrawbalance`, {
          owner_address: ownerHex,
          visible: false
        }, permissionId);
        if (tx?.result?.result === false) throw new Error(parseApiError(tx));
        return tx;
      };
      const tx = await buildTx();
      return await signAndBroadcastWithPermissionFallback(
        baseUrl,
        privateKey,
        ownerAddress,
        TRON_CONTRACT_TYPES.WITHDRAW_BALANCE,
        tx,
        async (permissionId) => buildTx(permissionId)
      );
    } catch (e: any) {
      devError('TRON claimReward failed', e);
      return { success: false, error: e?.message || 'claim reward failed' };
    }
  },

  /**
   * 查询交易是否已上链以及执行结果
   */
  getTransactionInfo: async (host: string, txid: string): Promise<{ found: boolean; success?: boolean }> => {
    try {
      const baseUrl = TronService.normalizeHost(host);
      // Prefer fullnode endpoint first for fresher data, then fallback to solidity endpoint.
      const result = await postJsonFirstSuccess<any>([
        { url: `${baseUrl}/wallet/gettransactioninfobyid`, body: { value: txid } },
        { url: `${baseUrl}/walletsolidity/gettransactioninfobyid`, body: { value: txid } }
      ]);
      if (!result || Object.keys(result).length === 0) return { found: false };

      const receiptResult = String(result.receipt?.result || '').toUpperCase();
      if (receiptResult) {
        if (receiptResult !== 'SUCCESS') return { found: true, success: false };
        return { found: true, success: true };
      }

      // Some TRON nodes return transaction info with blockNumber but without receipt.result.
      // Treat it as confirmed unless a later probe reports explicit failure.
      if (typeof result.blockNumber === 'number' && result.blockNumber >= 0) {
        return { found: true, success: true };
      }

      // Fallback: probe transaction object and read contractRet.
      const tx = await postJson<any>(`${baseUrl}/wallet/gettransactionbyid`, { value: txid });
      if (!tx || Object.keys(tx).length === 0) return { found: false };
      const contractRet = String(tx?.ret?.[0]?.contractRet || '').toUpperCase();
      if (contractRet) {
        if (contractRet === 'SUCCESS') return { found: true, success: true };
        if (contractRet !== 'SUCCESS') return { found: true, success: false };
      }
      // Found but still not finalized.
      return { found: true };
    } catch (e) {
      return { found: false };
    }
  },

  /**
   * 构建、签名并广播交易
   */
  sendTransaction: async (host: string, privateKey: string, to: string, amount: bigint, contractAddress?: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
    const baseUrl = TronService.normalizeHost(host);
    if (!baseUrl) return { success: false, error: 'Missing TRON RPC base URL' };
    const ownerAddress = TronService.addressFromPrivateKey(privateKey);
    const ownerHex = TronService.toHexAddress(ownerAddress).replace('0x', '');
    const toHex = TronService.toHexAddress(to).replace('0x', '');
    if (!ownerHex || !toHex) return { success: false, error: 'Invalid address' };

    try {
      const buildUnsignedTx = async (permissionId?: number): Promise<any> => {
        if (contractAddress) {
          // TRC20 Transfer
          const contractHex = TronService.toHexAddress(contractAddress).replace('0x', '');
          if (!contractHex) throw new Error('Invalid contract address');
          const functionSelector = "transfer(address,uint256)";
          const parameter = toHex.padStart(64, '0') + amount.toString(16).padStart(64, '0');

          const result = await postJsonWithPermissionVariants<any>(`${baseUrl}/wallet/triggersmartcontract`, {
            owner_address: ownerHex,
            contract_address: contractHex,
            function_selector: functionSelector,
            parameter: parameter,
            fee_limit: 100000000, // 100 TRX limit
            visible: false
          }, permissionId);
          if (!result.result?.result) {
            const raw = result.result?.message || result.message || 'Trigger contract failed';
            const decoded = tryDecodeHexAscii(raw) || tryDecodeBase64Ascii(raw);
            throw new Error(decoded || String(raw));
          }
          return result.transaction;
        }
        // Native TRX Transfer
        const amountNumber = Number(amount);
        if (!Number.isSafeInteger(amountNumber) || amountNumber < 0) {
          throw new Error("TRX amount exceeds safe integer range");
        }
        return await postJsonWithPermissionVariants<any>(`${baseUrl}/wallet/createtransaction`, {
          owner_address: ownerHex,
          to_address: toHex,
          amount: amountNumber,
          visible: false
        }, permissionId);
      };

      const transaction = await buildUnsignedTx();
      if (transaction.Error) throw new Error(transaction.Error);
      const contractType = contractAddress
        ? TRON_CONTRACT_TYPES.TRIGGER_SMART_CONTRACT
        : TRON_CONTRACT_TYPES.TRANSFER;
      return await signAndBroadcastWithPermissionFallback(
        baseUrl,
        privateKey,
        ownerAddress,
        contractType,
        transaction,
        async (permissionId) => {
          const retryTx = await buildUnsignedTx(permissionId);
          if (retryTx?.Error) throw new Error(retryTx.Error);
          return retryTx;
        }
      );
    } catch (e: any) {
      devError("TRON send failed", e);
      return { success: false, error: e.message };
    }
  },

  probeRpc: async (host: string): Promise<{ ok: boolean; error?: string }> => {
    const baseUrl = TronService.normalizeHost(host);
    if (!baseUrl) return { ok: false, error: 'Missing TRON RPC base URL' };

    try {
      const data = await postJson<any>(`${baseUrl}/wallet/getnowblock`, {});
      const looksLikeBlock = !!(data && (data.blockID || data.block_header || data.block_header?.raw_data));
      return looksLikeBlock ? { ok: true } : { ok: false, error: 'Unexpected response' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { ok: false, error: msg };
    }
  },

  addressFromPrivateKey: (privateKey: string): string => {
    const w = new ethers.Wallet(privateKey);
    const hexAddr = "0x41" + w.address.slice(2);
    return TronService.fromHexAddress(hexAddr);
  },

  toHexAddress: (base58Addr: string): string => {
    if (!base58Addr || base58Addr.startsWith("0x")) return base58Addr;
    try {
      const bytes = bs58.decode(base58Addr);
      if (bytes.length !== 25) return "";
      return bytesToHex(bytes.slice(0, -4));
    } catch (e) { return ""; }
  },

  fromHexAddress: (hexAddr: string): string => {
    if (!hexAddr.startsWith("0x")) hexAddr = "0x" + hexAddr;
    const bytes = ethers.getBytes(hexAddr.substring(0, 4) === "0x41" ? hexAddr : "0x41" + hexAddr.substring(2));
    const firstHash = ethers.sha256(bytesToHex(bytes));
    const hash = ethers.getBytes(ethers.sha256(firstHash));
    const checksum = hash.slice(0, 4);
    const finalBytes = new Uint8Array(bytes.length + 4);
    finalBytes.set(bytes);
    finalBytes.set(checksum, bytes.length);
    return bs58.encode(finalBytes);
  }
};

export const __TRON_TEST__ = {
  bytesToHex,
  fetchWithTimeout,
  postJson,
  postJsonFirstSuccess,
  clearTronGridRateLimitState,
  normalizeTronAddressToHex41,
  permissionAllowsContractType,
  resolveActivePermissionIdForSigner,
  isPermissionMismatchError,
  toTxPayload,
  parseApiError,
  signAndBroadcast,
  signAndBroadcastWithPermissionFallback,
  toResource,
  toSafeAmountNumber,
  tryDecodeHexAscii,
  tryDecodeBase64Ascii,
  clearWitnessCache,
  getWitnessCacheSize
};
