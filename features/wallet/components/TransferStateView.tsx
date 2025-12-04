
import React from 'react';
import { Check, ArrowRight, Loader2, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export type TransferStatus = 'idle' | 'sending' | 'success' | 'timeout' | 'error';

interface TransferStateViewProps {
  status: TransferStatus;
  txHash?: string;
  error?: string;
  onClose: () => void;
  explorerUrl?: string;
}

export const TransferStateView: React.FC<TransferStateViewProps> = ({
  status,
  txHash,
  error,
  onClose,
  explorerUrl
}) => {
  if (status === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 animate-in fade-in zoom-in duration-300">
      
      {/* SENDING STATE */}
      {status === 'sending' && (
        <div className="space-y-8">
          <div className="relative w-32 h-32 mx-auto">
            {/* Pulsing Rings */}
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-50 delay-75"></div>
            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border-4 border-indigo-50 shadow-xl z-10">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">正在广播交易...</h3>
            <p className="text-slate-500">正在将您的交易发送至区块链网络</p>
          </div>
        </div>
      )}

      {/* SUCCESS STATE (Fast Confirmation) */}
      {status === 'success' && (
        <div className="space-y-8">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border-4 border-green-50 shadow-xl z-10">
              <Check className="w-16 h-16 text-green-500 animate-in zoom-in duration-300" strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900">转账完成!</h3>
            <p className="text-slate-500">交易已成功上链并确认。</p>
          </div>
          <div className="pt-4 w-full max-w-xs mx-auto space-y-3">
             <Button onClick={onClose} className="w-full py-3 shadow-lg shadow-green-100">
               返回首页
             </Button>
             {txHash && explorerUrl && (
               <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center text-sm text-indigo-600 hover:text-indigo-700 font-bold">
                 查看浏览器详情 <ExternalLink className="w-3 h-3 ml-1" />
               </a>
             )}
          </div>
        </div>
      )}

      {/* TIMEOUT STATE (Broadcasted but waiting) */}
      {status === 'timeout' && (
        <div className="space-y-8">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-amber-100 rounded-full"></div>
            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border-4 border-amber-50 shadow-xl z-10">
              <Clock className="w-12 h-12 text-amber-500" />
              {/* Overlay Loader to indicate checking */}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-slate-100 shadow-sm">
                 <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">已广播，确认中...</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              交易已发送至网络，正在后台检查入块状态。您无需在此停留，确认成功后将自动更新状态。
            </p>
          </div>
          <div className="pt-4 w-full max-w-xs mx-auto space-y-3">
             <Button onClick={onClose} variant="secondary" className="w-full py-3">
               返回首页 (后台运行)
             </Button>
             {txHash && explorerUrl && (
               <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center text-sm text-indigo-600 hover:text-indigo-700 font-bold">
                 在浏览器查看 <ExternalLink className="w-3 h-3 ml-1" />
               </a>
             )}
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <div className="space-y-6">
           <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
             <span className="text-4xl">❌</span>
           </div>
           <div>
             <h3 className="text-lg font-bold text-red-600 mb-2">发送失败</h3>
             <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 max-w-xs mx-auto break-words">
                {error || "未知错误"}
             </p>
           </div>
           <Button onClick={onClose} variant="outline" className="min-w-[120px]">
              重试
           </Button>
        </div>
      )}
    </div>
  );
};
