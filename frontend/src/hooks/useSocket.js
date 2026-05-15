import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Single shared connection for the entire app lifetime
const socket = io(
  import.meta.env.VITE_API_URL || 'http://localhost:4001',
  { transports: ['websocket', 'polling'], autoConnect: true }
);

/**
 * useSocket — subscribe to a Socket.IO event.
 * Uses a callback ref so the subscription is stable and never
 * causes extra re-renders when the callback is an inline function.
 *
 * @param {string}   event    Socket event name
 * @param {function} callback Handler — receives the event payload
 */
export function useSocket(event, callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;           // always up-to-date, no stale closure

  useEffect(() => {
    function handler(data) { cbRef.current(data); }
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event]);                        // only re-subscribe if event name changes
}

/**
 * playNotify — soft Web Audio ping (no mp3 needed).
 * Silently no-ops if AudioContext is blocked by browser policy.
 */
export function playNotify() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch { /* blocked by browser — no-op */ }
}

export default socket;
