import { useEffect, useRef, useState } from 'react';

export function useRestAlert(until: number | null | undefined) {
  const audio = useRef<AudioContext | null>(null);
  const notified = useRef<number | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const prime = () => {
      try { audio.current ??= new AudioContext(); void audio.current.resume().catch(() => undefined); } catch { /* Vibration and visible notice remain available. */ }
    };
    document.addEventListener('pointerdown', prime);
    document.addEventListener('keydown', prime);
    return () => { document.removeEventListener('pointerdown', prime); document.removeEventListener('keydown', prime); void audio.current?.close().catch(() => undefined); audio.current = null; };
  }, []);
  useEffect(() => {
    setMessage('');
    if (!until) return;
    const check = () => {
      if (Date.now() < until || notified.current === until) return;
      notified.current = until;
      setMessage('Rest finished. Ready for your next set.');
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* Optional device API. */ }
      const context = audio.current;
      if (context?.state === 'running') {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
        oscillator.start(); oscillator.stop(context.currentTime + 0.5);
      }
    };
    check(); const interval = window.setInterval(check, 250);
    return () => window.clearInterval(interval);
  }, [until]);
  return message;
}
