import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'ah_pwa_install_dismissed';

let earlyDeferredPrompt: BeforeInstallPromptEvent | null = null;
let earlyInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  earlyInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    earlyDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    earlyInstalled = true;
    earlyDeferredPrompt = null;
    notifyListeners();
  });
}

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => earlyDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => earlyInstalled);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone || earlyInstalled);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const sync = () => {
      setDeferredPrompt(earlyDeferredPrompt);
      if (earlyInstalled) setIsInstalled(true);
    };
    listeners.add(sync);
    sync();

    return () => {
      listeners.delete(sync);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      earlyInstalled = true;
      earlyDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage failures
    }
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    dismissed,
    install,
    dismiss,
  };
}
