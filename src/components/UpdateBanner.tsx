import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export const UpdateBanner: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const attachRegistration = (reg: ServiceWorkerRegistration | undefined) => {
      if (!reg) return;
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
      }

      const handleUpdateFound = () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(reg.waiting ?? installing);
          }
        });
      };

      reg.addEventListener('updatefound', handleUpdateFound);
    };

    navigator.serviceWorker.getRegistration().then(attachRegistration).catch(() => {});

    const onCustomReg = (e: Event) => {
      const reg = (e as CustomEvent<ServiceWorkerRegistration>).detail;
      attachRegistration(reg);
    };

    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    window.addEventListener('ah-sw-registered', onCustomReg);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      window.removeEventListener('ah-sw-registered', onCustomReg);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waitingWorker) return null;

  const handleUpdate = () => {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[min(calc(100%-2rem),22.5rem)] rounded-2xl bg-[#14202c]/95 border border-white/18 px-4 py-3 shadow-2xl flex items-center justify-between gap-3"
    >
      <span className="text-sm font-bold text-white">Update available</span>
      <button
        type="button"
        onClick={handleUpdate}
        className="min-h-12 px-4 rounded-xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 text-white font-bold text-sm inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
      >
        <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Update</span>
      </button>
    </div>
  );
};
