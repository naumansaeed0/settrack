import { useEffect, useState } from 'react';

export function useWakeLock(active: boolean) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!active) { setMessage(''); return; }
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    let requesting = false;
    async function acquire() {
      if (document.visibilityState !== 'visible' || requesting || (lock && !lock.released)) return;
      if (!navigator.wakeLock) { setMessage('Keep-awake is unavailable in this browser. Your screen may lock during training.'); return; }
      requesting = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed) { await next.release(); return; }
        lock = next;
        setMessage('Screen stays awake while this workout is active and visible.');
        next.addEventListener('release', () => { if (!disposed) setMessage('Screen keep-awake paused. Your device may lock.'); });
      } catch { if (!disposed) setMessage('Keep-awake could not start. Your screen may lock during training.'); }
      finally { requesting = false; }
    }
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => { disposed = true; document.removeEventListener('visibilitychange', acquire); void lock?.release().catch(() => undefined); };
  }, [active]);
  return message;
}
