import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'full' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'full' }) => {
  const { isInstallable, isInstalled, isIOS, dismissed, install, dismiss } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  const canPrompt = isInstallable || isIOS;
  if (!canPrompt) {
    return null;
  }

  const handleAction = () => {
    if (isInstallable) {
      void install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const iosSheet = showIOSGuide ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0a1118]/80 backdrop-blur-sm pt-6"
      onClick={() => setShowIOSGuide(false)}
    >
      <div
        className="w-full max-w-[26rem] rounded-3xl bg-[#16222e] border border-white/15 p-5 text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <h2 id="ios-install-title" className="font-display text-xl font-extrabold text-white">
            Install Air Hockey
          </h2>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            aria-label="Close install instructions"
            className="min-h-11 min-w-11 -mt-1 -mr-1 rounded-xl bg-white/8 hover:bg-white/15 text-[#cbd8e2] hover:text-white inline-flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <ol className="mt-3 space-y-2.5 text-sm text-[#cbd8e2] leading-relaxed">
          <li className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-white/12 text-white font-bold text-xs inline-flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span>
              Tap the <strong className="text-white">Share</strong> button at the bottom of Safari.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-white/12 text-white font-bold text-xs inline-flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span>
              Scroll down and tap <strong className="text-white">Add to Home Screen</strong> for
              fullscreen offline play.
            </span>
          </li>
        </ol>
        <button
          type="button"
          onClick={() => setShowIOSGuide(false)}
          className="mt-5 w-full min-h-12 rounded-2xl bg-white text-[#101922] font-display font-extrabold text-base hover:bg-white/90 active:scale-[0.98] transition-transform cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  ) : null;

  if (variant === 'pill') {
    return (
      <>
        <div className="inline-flex items-center rounded-full bg-[#14202c]/95 border border-white/18 shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={handleAction}
            className="min-h-12 pl-3.5 pr-2.5 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 hover:bg-white/10 active:scale-[0.98] transition-transform cursor-pointer"
          >
            {isIOS && !isInstallable ? (
              <Share className="w-4 h-4 text-[#38bdf8] shrink-0" aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4 text-[#38bdf8] shrink-0" aria-hidden="true" />
            )}
            <span>Install App</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="min-h-12 min-w-11 pr-2.5 pl-1 text-[#a9bac6] hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        {iosSheet}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className="w-full min-h-12 px-4 rounded-2xl bg-[#14202c]/95 border border-white/18 hover:bg-white/12 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-transform cursor-pointer"
      >
        {isIOS && !isInstallable ? (
          <Share className="w-4 h-4 shrink-0" aria-hidden="true" />
        ) : (
          <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span>{isIOS && !isInstallable ? 'Install on iOS' : 'Install App'}</span>
      </button>
      {iosSheet}
    </>
  );
};
