import { Activity, Radio } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected?: boolean;
  isServerSignal?: boolean;
  className?: string;
}

export default function StatusIndicator({ isConnected = false, isServerSignal = true, className = '' }: StatusIndicatorProps) {
  // Modo 1: WebSocket conectado em tempo real
  if (isConnected) {
    return (
      <div className={`hidden md:flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-emerald-500/10 px-4 h-12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Via WebSocket</span>
      </div>
    );
  }

  // Modo 2: Servidor online e respondendo via requisições HTTP (fallback de sincronização)
  if (isServerSignal) {
    return (
      <div className={`hidden md:flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-sky-500/10 px-4 h-12 text-sky-700 dark:text-sky-300 text-xs font-medium ${className}`}>
        <Activity size={13} className="text-sky-500 dark:text-sky-400" />
        <span>Sincronizado via HTTP</span>
      </div>
    );
  }

  // Modo 3: Servidor sem sinal / offline
  return (
    <div className={`hidden md:flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/10 px-4 h-12 text-amber-800 dark:text-amber-300 text-xs font-bold ${className}`}>
      <Radio size={13} className="text-amber-500 animate-pulse" />
      <span>Aguardando Servidor</span>
    </div>
  );
}

