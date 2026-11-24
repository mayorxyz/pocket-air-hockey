import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register SW without auto-skipWaiting; UpdateBanner handles waiting -> SKIP_WAITING
registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      window.dispatchEvent(new CustomEvent('ah-sw-registered', { detail: registration }));
    }
  },
});

createRoot(document.getElementById('root')!).render(<App />);
