import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export const PWAUpdateManager: React.FC = () => {
  const [initialVersion, setInitialVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Check version from server and trigger Service Worker update
  const checkForUpdates = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
        }
      }

      // Check backend build timestamp/version
      const res = await fetch('/api/version?_t=' + Date.now(), { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          setInitialVersion((prev) => {
            if (!prev) return data.version;
            if (prev !== data.version) {
              console.log('[BJJCRON Update] Nova versão detectada:', data.version, 'anterior:', prev);
              setUpdateAvailable(true);
            }
            return prev;
          });
        }
      }
    } catch (e) {
      // Offline or network error - ignore silently
    }
  };

  const applyUpdate = () => {
    setIsUpdating(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
      // Clear browser caches
      if ('caches' in window) {
        caches.keys().then((keys) => {
          Promise.all(keys.map((k) => caches.delete(k))).then(() => {
            window.location.reload();
          });
        });
        return;
      }
    }
    window.location.reload();
  };

  useEffect(() => {
    // Initial check
    checkForUpdates();

    // Listen for ServiceWorker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'SW_UPDATED' || event.data.type === 'SW_ACTIVATED')) {
        console.log('[BJJCRON] Service Worker atualizado via mensagem.');
        setUpdateAvailable(true);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Check on app visibility / focus (when mobile user opens or returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handleFocus = () => {
      checkForUpdates();
    };

    const handleOnline = () => {
      checkForUpdates();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Periodic check every 45 seconds
    const interval = setInterval(checkForUpdates, 45000);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside
      aria-label="Notificação de atualização"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-short"
    >
      <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl shadow-amber-500/20 backdrop-blur-md flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              Nova Versão Disponível!
            </h4>
            <p className="text-[11px] text-slate-300">
              O BJJCRON foi atualizado com novas melhorias.
            </p>
          </div>
        </div>

        <button
          onClick={applyUpdate}
          disabled={isUpdating}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>
    </aside>
  );
};
