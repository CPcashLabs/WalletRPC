import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from './LanguageContext';
import { ConsoleView } from '../features/wallet/components/ConsoleView';

export type HttpConsoleCategory = 'rpc' | 'http';

export type HttpConsoleEvent = {
  id: string;
  ts: number;
  category: HttpConsoleCategory;
  method: string;
  url: string;
  host: string;
  status?: number;
  durationMs?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  rpcMethod?: string;
  isRpcBatch?: boolean;
  action?: string;
};

type HttpConsoleContextValue = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  open: () => void;
  events: HttpConsoleEvent[];
  clear: () => void;
};

const HttpConsoleContext = createContext<HttpConsoleContextValue | null>(null);

// Keep a large rolling buffer for UX while protecting memory on long sessions.
const MAX_EVENTS = 5000;
const MAX_BODY_CHARS = 2000;

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max)}...` : s);

const safeJsonParse = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return raw;
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
};

const redactRpcPayload = (payload: unknown): unknown => {
  // Avoid dumping huge or sensitive blobs (e.g., eth_sendRawTransaction raw tx).
  const redactHex = (v: unknown): unknown => {
    if (typeof v !== 'string') return v;
    const s = v.trim();
    if (!/^0x[0-9a-fA-F]+$/.test(s)) return v;
    if (s.length <= 66) return v; // normal hashes/addresses
    return `0x${s.slice(2, 18)}...${s.slice(-16)}`;
  };

  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return redactHex(v);
    const out: any = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === 'params' && Array.isArray(val) && typeof v?.method === 'string' && v.method === 'eth_sendRawTransaction') {
        out[k] = ['[redacted]'];
        continue;
      }
      out[k] = walk(val);
    }
    return out;
  };

  return walk(payload);
};

const deriveRpcMeta = (body: unknown): { rpcMethod?: string; isBatch?: boolean } => {
  if (!body) return {};
  if (Array.isArray(body)) {
    const methods = body.map((x) => (x && typeof x === 'object' ? (x as any).method : undefined)).filter(Boolean);
    const first = methods[0];
    return { rpcMethod: typeof first === 'string' ? first : undefined, isBatch: true };
  }
  if (typeof body === 'object') {
    const m = (body as any).method;
    return { rpcMethod: typeof m === 'string' ? m : undefined, isBatch: false };
  }
  return {};
};

const actionForRpc = (rpcMethod: string | undefined, t: (k: string) => string): string => {
  if (!rpcMethod) return t('console.action_unknown');
  const keyMap: Record<string, string> = {
    eth_getBalance: 'console.rpc.eth_getBalance',
    eth_getTransactionCount: 'console.rpc.eth_getTransactionCount',
    eth_getTransactionReceipt: 'console.rpc.eth_getTransactionReceipt',
    eth_sendRawTransaction: 'console.rpc.eth_sendRawTransaction',
    eth_getCode: 'console.rpc.eth_getCode',
    eth_call: 'console.rpc.eth_call',
    eth_estimateGas: 'console.rpc.eth_estimateGas',
    eth_feeHistory: 'console.rpc.eth_feeHistory',
    eth_gasPrice: 'console.rpc.eth_gasPrice',
    eth_maxPriorityFeePerGas: 'console.rpc.eth_maxPriorityFeePerGas',
    eth_getBlockByNumber: 'console.rpc.eth_getBlockByNumber',
    net_version: 'console.rpc.net_version',
    web3_clientVersion: 'console.rpc.web3_clientVersion'
  };
  const k = keyMap[rpcMethod];
  return k ? t(k) : t('console.action_unknown');
};

const actionForTronPath = (path: string, t: (k: string) => string): string => {
  const clean = path.replace(/^\/+/, '').toLowerCase();
  const keyMap: Record<string, string> = {
    'wallet/getaccount': 'console.tron.getaccount',
    'wallet/triggerconstantcontract': 'console.tron.triggerconstantcontract',
    'wallet/triggersmartcontract': 'console.tron.triggersmartcontract',
    'wallet/createtransaction': 'console.tron.createtransaction',
    'wallet/broadcasttransaction': 'console.tron.broadcasttransaction',
    'walletsolidity/gettransactioninfobyid': 'console.tron.gettransactioninfobyid'
  };
  const k = keyMap[clean];
  return k ? t(k) : t('console.action_unknown');
};

export const HttpConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<HttpConsoleEvent[]>([]);

  const fetchPatchedRef = useRef(false);
  const origFetchRef = useRef<typeof window.fetch | null>(null);
  const origXhrOpenRef = useRef<XMLHttpRequest['open'] | null>(null);
  const origXhrSendRef = useRef<XMLHttpRequest['send'] | null>(null);

  const pushEvent = (ev: HttpConsoleEvent) => {
    setEvents((prev) => {
      const next = [ev, ...prev];
      if (next.length > MAX_EVENTS) next.length = MAX_EVENTS;
      return next;
    });
  };

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (fetchPatchedRef.current) return;

    fetchPatchedRef.current = true;
    origFetchRef.current = window.fetch.bind(window);

    window.fetch = (async (input: any, init?: RequestInit) => {
      const start = Date.now();
      const method = (init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : (input?.url || String(input));
      let host = '';
      let pathname = '';
      try {
        const u = new URL(url, window.location.href);
        host = u.host;
        pathname = u.pathname;
      } catch {
        host = 'unknown';
      }

      const rawBody = init?.body;
      const requestText = typeof rawBody === 'string' ? clip(rawBody, MAX_BODY_CHARS) : rawBody;
      const parsedBody = safeJsonParse(requestText);
      const rpcMeta = deriveRpcMeta(parsedBody);
      const isLikelyRpc = method === 'POST' && typeof parsedBody === 'object' && !!rpcMeta.rpcMethod;
      const category: HttpConsoleCategory = isLikelyRpc ? 'rpc' : 'http';

      try {
        const res = await origFetchRef.current!(input, init);
        const durationMs = Date.now() - start;
        let responseBody: unknown = undefined;
        try {
          const cloned = res.clone();
          const text = await cloned.text();
          responseBody = safeJsonParse(clip(text, MAX_BODY_CHARS));
        } catch {
          // ignore
        }

        const reqBodyFinal = category === 'rpc' ? redactRpcPayload(parsedBody) : parsedBody;
        let action = t('console.action_unknown');
        if (category === 'rpc') {
          action = actionForRpc(rpcMeta.rpcMethod, t);
        } else if (host && pathname && host !== 'unknown' && pathname.startsWith('/wallet')) {
          action = actionForTronPath(pathname, t);
        }

        pushEvent({
          id: `${start}:${Math.random().toString(16).slice(2)}`,
          ts: start,
          category,
          method,
          url,
          host: host || 'unknown',
          status: res.status,
          durationMs,
          requestBody: reqBodyFinal,
          responseBody,
          rpcMethod: rpcMeta.rpcMethod,
          isRpcBatch: rpcMeta.isBatch,
          action
        });
        return res;
      } catch (e) {
        const durationMs = Date.now() - start;
        pushEvent({
          id: `${start}:${Math.random().toString(16).slice(2)}`,
          ts: start,
          category,
          method,
          url,
          host: host || 'unknown',
          status: undefined,
          durationMs,
          requestBody: category === 'rpc' ? redactRpcPayload(parsedBody) : parsedBody,
          responseBody: { error: String((e as any)?.message || e) },
          rpcMethod: rpcMeta.rpcMethod,
          isRpcBatch: rpcMeta.isBatch,
          action: category === 'rpc' ? actionForRpc(rpcMeta.rpcMethod, t) : t('console.action_unknown')
        });
        throw e;
      }
    }) as any;

    // Patch XHR (some libs may still use it)
    const proto = XMLHttpRequest.prototype;
    origXhrOpenRef.current = proto.open;
    origXhrSendRef.current = proto.send;

    proto.open = function (this: XMLHttpRequest, m: string, url: string, ...rest: any[]) {
      (this as any).__walletrpc_console = {
        start: Date.now(),
        method: String(m || 'GET').toUpperCase(),
        url
      };
      return origXhrOpenRef.current!.call(this, m, url, ...rest);
    } as any;

    proto.send = function (this: XMLHttpRequest, body?: any) {
      const meta = (this as any).__walletrpc_console || { start: Date.now(), method: 'GET', url: '' };
      const start = meta.start || Date.now();
      const method = meta.method || 'GET';
      const url = meta.url || '';
      let host = '';
      let pathname = '';
      try {
        const u = new URL(url, window.location.href);
        host = u.host;
        pathname = u.pathname;
      } catch {
        host = 'unknown';
      }

      const requestText = typeof body === 'string' ? clip(body, MAX_BODY_CHARS) : body;
      const parsedBody = safeJsonParse(requestText);
      const rpcMeta = deriveRpcMeta(parsedBody);
      const category: HttpConsoleCategory = method === 'POST' && typeof parsedBody === 'object' && !!rpcMeta.rpcMethod ? 'rpc' : 'http';

      const finalize = () => {
        const durationMs = Date.now() - start;
        let action = t('console.action_unknown');
        if (category === 'rpc') action = actionForRpc(rpcMeta.rpcMethod, t);
        else if (host && pathname && pathname.startsWith('/wallet')) action = actionForTronPath(pathname, t);

        pushEvent({
          id: `${start}:${Math.random().toString(16).slice(2)}`,
          ts: start,
          category,
          method,
          url,
          host: host || 'unknown',
          status: this.status || undefined,
          durationMs,
          requestBody: category === 'rpc' ? redactRpcPayload(parsedBody) : parsedBody,
          responseBody: undefined,
          rpcMethod: rpcMeta.rpcMethod,
          isRpcBatch: rpcMeta.isBatch,
          action
        });
      };

      this.addEventListener('loadend', finalize, { once: true } as any);
      return origXhrSendRef.current!.call(this, body);
    } as any;

    return () => {
      // Restore
      if (origFetchRef.current) window.fetch = origFetchRef.current;
      if (origXhrOpenRef.current) XMLHttpRequest.prototype.open = origXhrOpenRef.current;
      if (origXhrSendRef.current) XMLHttpRequest.prototype.send = origXhrSendRef.current;
      fetchPatchedRef.current = false;
    };
  }, [enabled, t]);

  const value = useMemo<HttpConsoleContextValue>(() => {
    return {
      enabled,
      setEnabled,
      expanded,
      setExpanded,
      open: () => {
        setEnabled(true);
        setExpanded(true);
      },
      events,
      clear: () => setEvents([])
    };
  }, [enabled, expanded, events]);

  return (
    <HttpConsoleContext.Provider value={value}>
      {children}
      <HttpConsoleDock />
    </HttpConsoleContext.Provider>
  );
};

export const useHttpConsole = (): HttpConsoleContextValue => {
  const ctx = useContext(HttpConsoleContext);
  if (!ctx) throw new Error('Missing HttpConsoleProvider');
  return ctx;
};

const HttpConsoleDock: React.FC = () => {
  const { t } = useTranslation();
  const { enabled, setEnabled, expanded, setExpanded, events, open } = useHttpConsole();

  // Show the dock if enabled or expanded (expanded implies enabled, but keep it robust).
  const visible = enabled || expanded;
  const latest = events[0];

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[90] px-3 sm:px-4 pb-3 pointer-events-none"
      style={{ bottom: 'calc(0.5rem + var(--safe-bottom))' }}
    >
      <div className="max-w-5xl mx-auto pointer-events-auto">
        {!expanded ? (
          <button
            type="button"
            aria-label="http-console-dock"
            onClick={() => open()}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-md shadow-xl px-4 py-3 flex items-center justify-between gap-3 hover:bg-white transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                {t('console.dock_title')}
              </div>
              <div className="text-xs font-black text-slate-900 truncate">
                {latest?.action || t('console.dock_empty')}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {latest ? `${latest.method} ${latest.host}` : t('console.dock_hint')}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-900 text-white">
                {events.length}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-full">
                {t('console.expand')}
              </span>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="max-h-[70vh] overflow-hidden">
              <ConsoleView mode="dock" onMinimize={() => setExpanded(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
