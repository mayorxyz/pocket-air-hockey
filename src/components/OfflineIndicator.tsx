import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        left: 'max(0.75rem, env(safe-area-inset-left))',
      }}
      className="fixed z-40 flex items-center gap-2 rounded-xl bg-[#14202c]/95 border border-white/16 px-3 py-2 text-xs font-semibold text-[#e9f1f4] shadow-lg pointer-events-none"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#f0452d] shrink-0" aria-hidden="true" />
      <span>Offline mode — ready to play</span>
    </div>
  );
};
