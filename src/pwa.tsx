import { useEffect, useRef, useState } from 'react';

export function PwaUpdate({ safeToReload }: { safeToReload: boolean }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState('');
  const accepted = useRef(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const controllerChanged = () => { if (accepted.current) location.reload(); };
    const refresh = () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined); };
    navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
    document.addEventListener('visibilitychange', refresh);
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).then(reg => {
      if (disposed) return;
      registration = reg;
      const check = () => { if (!disposed && reg.waiting) setWaiting(reg.waiting); };
      check();
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', check);
      });
      void reg.update().catch(() => undefined);
    }).catch(() => { if (!disposed) setError('Offline installation could not complete. Reconnect and reload to try again.'); });
    return () => { disposed = true; navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!waiting) return null;
  return <div className="rest-notice"><p>Update available. Your saved journal stays on this device.</p><button className="button primary" disabled={!safeToReload} onClick={() => { accepted.current = true; waiting.postMessage({ type: 'SKIP_WAITING' }); }}>Update and reload</button>{!safeToReload && <p>Finish saving or export your unsaved changes before updating.</p>}</div>;
}
