import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, LayoutDashboard, Play, Square } from 'lucide-react';
import { Chart } from '../components/dashboard/PerformanceChart.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useLive } from '../context/LiveContext.jsx';
import { METRICS, fmt, saveLive, startLive, stopLive } from '../api.js';

const SPEEDS = [1, 10, 60]; // exam minutes a second
const TITLES = Object.fromEntries(METRICS.map((m) => [m.key, m.title]));

// The live stream's state now: the last minute, and whether an incident is open.
function Status({ live, slowMs, connected, children }) {
  const last = live.minutes.at(-1);
  const now = live.minutes.findLast((m) => 'response_time_ms' in m); // log-only minutes have no metrics
  const open = live.incidents.find((i) => i.open);
  const top = open?.suspects?.[0];

  let headline, detail;
  if (!last) {
    headline = 'Waiting for records';
    detail = 'Play a session below, or send records to POST /api/live/ingest.';
  } else if (open) {
    headline = `${open.id} in progress`;
    detail = `Pages at ${fmt(now.response_time_ms)} ms, over the ${slowMs / 1000} s target for ${open.minutes} min since ${open.start}.`
      + (top ? ` Top suspect so far: ${TITLES[top.key]}, ${top.change}.` : '');
  } else {
    headline = 'Portal healthy';
    detail = now ? `Pages at ${fmt(now.response_time_ms)} ms.` : 'Only log lines so far, no metric rows.';
  }

  return (
    <section className={`clock ${open ? 'clock-alarm' : last ? '' : 'clock-idle'}`} aria-live="polite">
      <div className="clock-face">
        <div className="clock-time num">{last?.t ?? '--:--'}</div>
        <div className="clock-status">
          <h2>{headline}</h2>
          <p>{detail}</p>
          <p className="live-meta">
            <span className={`pill ${live.feeding ? 'is-live' : ''}`}>
              <span className="live-dot" />
              {!connected ? 'Reconnecting' : live.feeding ? 'Streaming' : 'Not streaming'}
            </span>
            <span className="num">{fmt(live.received)}</span> records from {live.source}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

// Every alert the stream raised, newest first.
function AlertFeed({ events }) {
  return (
    <section className="card flush">
      <div className="panel-head">
        <h3>Alerts</h3>
        <p className="muted small">Newest first. Red, yellow and green ones also pop up on every page.</p>
      </div>
      {events.length ? (
        <ol className="alert-feed">
          {events.slice().reverse().map((ev) => (
            <li key={ev.id} className={`alert-${ev.level}`}>
              <span className="num muted">{ev.t}</span>
              <div>
                <strong>{ev.title}</strong>
                <p>{ev.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="panel-note muted">No alerts yet.</p>}
    </section>
  );
}

// The latest incident's possible causes, as live.py ranks them each minute.
function LiveSuspects({ incident }) {
  if (!incident?.suspects) {
    return (
      <section className="card">
        <h3>Suspects</h3>
        <p className="muted small">When an incident opens, the possible causes are ranked here every minute.</p>
      </section>
    );
  }
  const top = incident.suspects[0];
  const lead = top.change === 'new' || top.pct >= 10;
  const nothingMoved = top.pct != null && top.pct < 10;
  return (
    <section className="card flush">
      <div className="panel-head">
        <h3>Suspects for {incident.id}</h3>
        <p className="muted small">
          {incident.open ? 'Updated every minute while it lasts' : `It recovered after ${incident.minutes} min`}.
          Ranked by change from the 15 minutes before it. A lead, not proof.
        </p>
      </div>
      <table className="table">
        <thead><tr><th>Metric</th><th>15 min before → during</th><th>Change</th></tr></thead>
        <tbody>
          {incident.suspects.map((s, i) => (
            <tr key={s.key} className={i === 0 && lead ? 'top-suspect' : ''}>
              <td>{TITLES[s.key]}</td>
              <td className="num">{s.before == null ? '-' : fmt(s.before)} → {fmt(s.during)}</td>
              <td className="num">{s.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {nothingMoved && (
        <p className="panel-note">
          None of these changed by 10% or more, so the cause is probably outside them. Check the high-risk log lines.
        </p>
      )}
    </section>
  );
}

// The newest log lines as they arrive, each with its risk and the reason for it.
function LogTail({ live }) {
  const [onlyHigh, setOnlyHigh] = useState(false);
  const lines = (onlyHigh ? live.high : live.logs).slice().reverse();
  const total = Object.values(live.risks).reduce((a, b) => a + b, 0);
  return (
    <section className="card flush">
      <div className="panel-head log-head">
        <div>
          <h3>Incoming log</h3>
          <p className="muted small">
            The newest lines first, each flagged by the risk it poses. A high-risk line raises an alert the moment it arrives.
          </p>
        </div>
        <div className="seg-control" role="group" aria-label="Which lines">
          <button className={`seg-btn ${onlyHigh ? '' : 'active'}`} onClick={() => setOnlyHigh(false)}>
            All lines <span className="num">{fmt(total)}</span>
          </button>
          <button className={`seg-btn ${onlyHigh ? 'active' : ''}`} onClick={() => setOnlyHigh(true)}>
            High risk <span className="num">{fmt(live.risks.high ?? 0)}</span>
          </button>
        </div>
      </div>
      {lines.length ? (
        <div className="table-wrap log-tail">
          <table className="table font-mono">
            <thead><tr><th>Time</th><th>Risk</th><th>Message</th><th>Why</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${l.timestamp}-${i}`} className={l.risk === 'high' ? 'risk-row-high' : ''}>
                  <td className="nowrap">{l.timestamp.slice(11, 19)}</td>
                  <td><span className={`badge risk-${l.risk}`}>{l.risk}</span></td>
                  <td className="log-message">{l.message}</td>
                  <td className="log-why">{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="panel-note muted">{onlyHigh ? 'No high-risk lines yet.' : 'No log lines yet.'}</p>}
    </section>
  );
}

// What a log shipper or script sends instead of a stored session.
const example = (origin) => `curl -X POST '${origin}/api/live/ingest?new=true' --data-binary @- <<'EOF'
{"kind": "log", "timestamp": "2026-10-31 09:30:05", "level": "error", "message": "mod_jk child workerEnv in error state 8"}
{"kind": "complaint", "timestamp": "2026-10-31 09:30:20", "complaint_text": "The page froze"}
{"kind": "metric", "timestamp": "2026-10-31 09:30:00", "active_users": 900, "response_time_ms": 1500, "cpu_usage_pct": 40, "memory_usage_pct": 50, "db_query_time_ms": 80, "bandwidth_mbps": 100, "error_count": 3}
EOF`;

// Real-time analysis of an incoming stream: a stored session played as if it
// were happening now, or records sent by anything that can POST.
export default function Live() {
  const { sessions, session, addSessions, data } = useApp();
  const { live, connected, desktop, toggleDesktop } = useLive();
  const navigate = useNavigate();
  const [source, setSource] = useState(session);
  const [speed, setSpeed] = useState(10);
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Run one button's action, showing its error under the controls.
  async function act(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!live) return <EmptyState title="Connecting to the live stream" hint="Waiting for /api/live/stream to answer." />;

  // The chart starts at live.first; incident minutes count from the start of the stream.
  const t = (i) => live.minutes[i - live.first]?.t;
  const bands = live.incidents
    .map((inc) => [Math.max(inc.first, live.first), inc.last])
    .filter(([first, last]) => first <= last)
    .map(([first, last]) => [t(first), t(last)]);

  return (
    <>
      <Status live={live} slowMs={data.slowMs} connected={connected}>
        <div className="clock-controls">
          <select className="select-input" aria-label="Session to play" value={source}
                  onChange={(e) => setSource(e.target.value)}>
            {sessions.map(({ name }) => <option key={name} value={name}>{name}</option>)}
          </select>
          <label className="filter-select-label" title="Minutes before this go in at once and quietly, so the detectors know what normal looks like">
            From
            <input className="select-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <div className="seg-control" role="group" aria-label="Stream speed">
            {SPEEDS.map((s) => (
              <button key={s} className={`seg-btn ${s === speed ? 'active' : ''}`} onClick={() => setSpeed(s)}>
                {s} min/s
              </button>
            ))}
          </div>
          <button className="btn primary" disabled={busy} onClick={() => act(() => startLive(source, speed, start))}>
            <Play size={15} /> {live.feeding ? 'Restart' : 'Play live'}
          </button>
          {live.feeding && (
            <button className="btn" disabled={busy} onClick={() => act(stopLive)}><Square size={14} /> Stop</button>
          )}
          <button className="btn" disabled={busy || !live.minutes.length}
                  onClick={() => act(async () => { await addSessions([await saveLive()]); navigate('/'); })}>
            <LayoutDashboard size={15} /> Open recording on dashboard
          </button>
          {'Notification' in window && (
            <button className={`btn ghost ${desktop ? 'on' : ''}`} aria-pressed={desktop}
                    onClick={async () => setError(await toggleDesktop())}>
              {desktop ? <Bell size={15} /> : <BellOff size={15} />} Desktop alerts {desktop ? 'on' : 'off'}
            </button>
          )}
          {error && <span className="inline-error" role="alert">{error}</span>}
        </div>
      </Status>

      <div className="section-head">
        <h2>The last {live.minutes.length} minutes</h2>
        <p className="muted">Red bands are incidents, the dashed line is the {data.slowMs / 1000} s target.</p>
      </div>
      <div className="timeline">
        <Chart rows={live.minutes} dataKey="response_time_ms" title="Response time" unit="ms"
               bands={bands} target={data.slowMs} height={110} xAxis={false} animate={false} />
        <Chart rows={live.minutes} dataKey="log_errors" title="Apache error lines" unit="/min"
               bands={bands} height={110} xAxis animate={false} />
      </div>

      <div className="grid-main mt-md">
        <AlertFeed events={live.events} />
        <LiveSuspects incident={live.incidents.at(-1)} />
      </div>

      <div className="mt-md">
        <LogTail live={live} />
      </div>

      <details className="answer-key">
        <summary>Send records from a log shipper or script</summary>
        <p className="muted small">
          One JSON object per line, in time order. A minute is analyzed when its metric row arrives, or when
          a record from a later minute does. <code>new=true</code> starts a new stream.
        </p>
        <pre className="code-block">{example(window.location.origin)}</pre>
      </details>
    </>
  );
}
