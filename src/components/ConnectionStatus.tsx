import { WifiOff, AlertCircle, Wifi } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isServerSignal: boolean;
}

export default function ConnectionStatus({ isConnected, isServerSignal }: ConnectionStatusProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const prevIsConnected = useRef(isConnected);

  const hasServerSignalAlert = !isServerSignal && isConnected && !showSuccess;

  useEffect(() => {
    if (!prevIsConnected.current && isConnected) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      prevIsConnected.current = isConnected;
      return () => clearTimeout(timer);
    }
    prevIsConnected.current = isConnected;
  }, [isConnected]);

  return (
    <>
      {/* TARJA VERDE */}
      <div
        className={`fixed top-4 left-1/2 z-50 flex w-max max-w-[calc(100%-2rem)] items-center justify-center rounded-full bg-green-700 text-white shadow-lg transition-all duration-500 ease-out
          ${showSuccess ? 'opacity-100 translate-y-0 -translate-x-1/2' : 'opacity-0 -translate-y-8 -translate-x-1/2 pointer-events-none'}`}
      >
        <div className="flex items-center gap-2.5 px-4 py-2">
          <Wifi size={16} className="shrink-0" />
          <h2 className="text-xs font-bold tracking-wide sm:text-sm">Conexão restabelecida</h2>
        </div>
      </div>

      {/* TARJA VERMELHA */}
      <div
        className={`fixed top-4 left-1/2 z-50 flex w-max max-w-[calc(100%-2rem)] items-center justify-center rounded-full bg-red-700 text-white shadow-lg transition-all duration-500 ease-out
          ${!isConnected && !showSuccess ? 'opacity-100 translate-y-0 -translate-x-1/2' : 'opacity-0 -translate-y-8 -translate-x-1/2 pointer-events-none'}`}
      >
        <div className="flex items-center gap-2.5 px-4 py-2">
          <WifiOff size={16} className="animate-pulse shrink-0" />
          <div className="leading-tight">
            <h2 className="text-xs font-bold tracking-wide sm:text-sm">Sem conexão com a internet</h2>
            <p className="text-[10px] text-white/85 sm:text-xs">Verifique sua conexão</p>
          </div>
        </div>
      </div>

      {/* Server connection status */}
      <div
        className={`transition-all duration-500 ease-out overflow-hidden ${
          hasServerSignalAlert ? 'h-16 mt-2' : 'h-0 mt-0'
        }`}
      >
        <div
          className={`mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center justify-center rounded-full bg-slate-950 text-white shadow-lg transition-all duration-500 ease-out ${
            hasServerSignalAlert ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2.5 px-4 py-2">
            <AlertCircle size={16} className="shrink-0 text-amber-400" />
            <div className="min-w-0 leading-tight">
              <h2 className="whitespace-nowrap text-xs font-bold tracking-wide">
                Servidor sem sinal
              </h2>
              <p className="whitespace-nowrap text-[10px] text-slate-300">
                Tentando reconectar...
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}