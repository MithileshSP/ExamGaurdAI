import { createContext, useContext, useEffect, useRef, useState } from 'react';

const LiveContext = createContext(null);

// Alerts that pop up on every page. Info alerts (new messages, stream started)
// stay in the feed on the Live page.
const POP_UP = ['alarm', 'warn', 'ok'];

// The live stream, followed for the whole app rather than by the Live page, so
// it keeps going on every page and its alerts can pop up wherever you are.
export function LiveProvider({ children }) {
  const [live, setLive] = useState(null); // the latest state from /api/live/stream
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [desktop, setDesktop] = useState(false); // also show alarms as desktop notifications
  const desktopRef = useRef(false); // the same, for the stream handler below
  const shown = useRef(null); // { stream, id }: the newest alert already popped up

  useEffect(() => {
    // EventSource reads server-sent events and reconnects by itself when the server restarts.
    const source = new EventSource('/api/live/stream');
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (e) => {
      const next = JSON.parse(e.data);
      setLive(next);
      const before = shown.current;
      shown.current = { stream: next.stream, id: next.events.at(-1)?.id ?? 0 };
      if (!before) return; // the first state after the page opens: its alerts are old news
      const from = before.stream === next.stream ? before.id : 0; // a new stream counts from 0
      const fresh = next.events.filter((ev) => ev.id > from && POP_UP.includes(ev.level));
      if (!fresh.length) return;
      // At most four on screen; the newest push the oldest out.
      setToasts((all) => [...all, ...fresh.map((ev) => ({ ...ev, key: `${next.stream}-${ev.id}` }))].slice(-4));
      if (desktopRef.current) {
        for (const ev of fresh.filter((f) => f.level === 'alarm')) {
          // One tag, so a burst of alarms replaces one notification instead of stacking many.
          new Notification(`ExamGuard: ${ev.title}`, { body: `${ev.t} ${ev.detail}`, tag: 'examguard-live' });
        }
      }
    };
    return () => source.close();
  }, []);

  const dismiss = (key) => setToasts((all) => all.filter((t) => t.key !== key));

  // Turning desktop notifications on asks the browser for permission the first time.
  // Returns an error to show, or null.
  async function toggleDesktop() {
    if (desktop) {
      setDesktop(desktopRef.current = false);
      return null;
    }
    if (await Notification.requestPermission() !== 'granted') {
      return 'The browser blocked notifications for this site. Allow them in the site settings, then try again.';
    }
    setDesktop(desktopRef.current = true);
    return null;
  }

  return (
    <LiveContext.Provider value={{ live, connected, toasts, dismiss, desktop, toggleDesktop }}>
      {children}
    </LiveContext.Provider>
  );
}

export const useLive = () => useContext(LiveContext);
