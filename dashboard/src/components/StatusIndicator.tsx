import { WifiOff } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
}

export default function StatusIndicator({ isConnected }: StatusIndicatorProps) {
  if (isConnected) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-red-800 dark:bg-red-950 dark:text-red-200">
      <WifiOff size={12} className="animate-pulse" />
      <span className="text-xs font-bold">SEM CONEXÃO</span>
    </div>
  );
}
