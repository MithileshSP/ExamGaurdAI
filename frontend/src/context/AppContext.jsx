import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { listSessions, loadSession, snapshot, streamAnalysis } from '../api.js';

const AppContext = createContext(null);

export const SPEEDS = [10, 60, 300]; // replay speeds, in exam minutes per second

// The state every page shares: the session, the replay clock, and the AI analysis.
export function AppProvider({ children }) {
  const [sessions, setSessions] = useState([]); // [{ name, answer }]
  const [session, setSession] = useState(null); // the chosen session's name
  const [raw, setRaw] = useState(null); // what loadSession() returns, null while loading
  const [error, setError] = useState(null);
  const [viewLabel, setViewLabel] = useState('Whole session');
  const [cursor, setCursor] = useState(null); // last minute shown; null = the whole session
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[0]);
  const [analysis, setAnalysis] = useState(null); // { session, thinking, report, running, error }
  const [reports, setReports] = useState({}); // the saved report.md of each session

  useEffect(() => {
    listSessions().then((list) => { setSessions(list); setSession(list[0].name); }).catch(setError);
  }, []);

  useEffect(() => {
    if (!session) return;
    let current = true; // false once the user picks another session
    setRaw(null);
    setError(null);
    setCursor(null);
    setPlaying(false);
    setViewLabel('Whole session');
    loadSession(session).then((r) => {
      if (!current) return;
      setRaw(r);
      setReports((all) => ({ ...all, [r.name]: r.report }));
    }, (e) => current && setError(e));
    return () => { current = false; };
    // A new session list also reloads: an upload may have just replaced this session's files.
  }, [session, sessions]);

  // After an upload: fetch the session list again and open the first new session.
  async function addSessions(names) {
    setSessions(await listSessions());
    setSession(names[0]);
  }

  const end = raw ? raw.timeline.minutes.length - 1 : 0;
  const upto = cursor ?? end;
  // Every page reads `data`: the session cut off at the replay clock.
  const data = useMemo(() => raw && snapshot(raw, upto), [raw, upto]);
  // A view that is not there yet (its incident starts later in the replay) falls back to the whole session.
  const view = data && (data.views.find((v) => v.label === viewLabel) ?? data.views[0]);

  // The replay: ten ticks a second, each moving the clock speed/10 minutes on.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setCursor((c) => {
        const from = c ?? 0;
        const next = Math.min(from + speed / 10, end);
        // Stop on the minute an incident starts, so the presenter can explain it.
        const hit = raw.timeline.incidents.find(([first]) => from < first && first <= next);
        if (hit || next === end) setPlaying(false);
        return hit ? hit[0] : next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [playing, speed, end, raw]);

  const replay = {
    start() { setViewLabel('Whole session'); setCursor(0); setPlaying(true); },
    pause() { setPlaying(false); },
    resume() { setPlaying(true); },
    seek(minute) { setPlaying(false); setCursor(minute >= end ? null : minute); },
    stop() { setPlaying(false); setCursor(null); },
  };

  // Ask DeepSeek again. It runs here, not in a page, so it keeps going when you
  // change pages, and a second run cannot start while one is going.
  async function runAnalysis() {
    if (analysis?.running) return;
    const name = raw.name;
    let report = '';
    setAnalysis({ session: name, thinking: '', report: '', running: true });
    try {
      await streamAnalysis(name, (kind, text) => {
        if (kind === 'report') report += text;
        setAnalysis((a) => ({ ...a, [kind]: a[kind] + text }));
      });
      setAnalysis((a) => ({ ...a, running: false }));
      setReports((all) => ({ ...all, [name]: report })); // what analyze() saved as report.md
    } catch (e) {
      setAnalysis((a) => ({ ...a, running: false, error: e.message }));
    }
  }

  return (
    <AppContext.Provider value={{
      sessions, session, setSession, addSessions, data, error, view, setViewLabel, playing, speed, setSpeed,
      replay, analysis, runAnalysis, reports,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
