import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METRICS, fmt, minuteOf } from '../api.js';

export default function Complaints() {
  const { data } = useApp();
  const [sel, setSel] = useState(0);

  // Students often send the same text in the same minute: one row per minute and text.
  const groups = {};
  for (const c of data.complaints) {
    const key = `${minuteOf(c.timestamp)} ${c.complaint_text}`;
    groups[key] ??= { time: minuteOf(c.timestamp), text: c.complaint_text, count: 0 };
    groups[key].count += 1;
  }
  const rows = Object.values(groups).map((g, i) => ({
    ...g, id: i,
    incident: data.incidents.find((inc) => inc.start <= g.time && g.time <= inc.end),
  }));
  const linked = rows.reduce((sum, r) => sum + (r.incident ? r.count : 0), 0);
  const texts = Object.entries(
    data.complaints.reduce((a, c) => ({ ...a, [c.complaint_text]: (a[c.complaint_text] || 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]);
  const row = rows[sel] ?? rows[0]; // the replay may have cut the chosen row
  const minute = row && data.series.find((m) => m.t === row.time); // the metrics at that minute

  return (
    <>
      <PageHeader
        title="Student complaints"
        description="What students reported, next to what the server and network showed at that minute."
      />

      <div className="grid-3 mb-md">
        <div className="card">
          <span className="label">Total complaints</span>
          <div className="stat num">{data.complaints.length}</div>
        </div>

        <div className="card">
          <span className="label">During an incident</span>
          <div className="stat num text-warn">{linked}</div>
        </div>

        <div className="card">
          <span className="label">Most common</span>
          <ul className="top-list">
            {texts.slice(0, 3).map(([t, n]) => <li key={t}><b className="num">{n}x</b> {t}</li>)}
          </ul>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card"><EmptyState title="No complaints in this session" /></div>
      ) : (
        <div className="grid-main">
          <div className="card flush">
            <div className="table-wrap tall">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Time</th>
                    <th style={{ width: '70px' }}>Count</th>
                    <th>Complaint</th>
                    <th style={{ width: '100px' }}>Incident</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      tabIndex={0}
                      className={`click ${sel === c.id ? 'sel-row' : ''}`}
                      onClick={() => setSel(c.id)}
                    >
                      <td className="num font-mono">{c.time}</td>
                      <td className="num font-mono">{c.count}</td>
                      <td>{c.text}</td>
                      <td className="num font-mono code-link">{c.incident?.id ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="card complaint-aside">
            <h3>{row.count} complaint(s) at {row.time}</h3>
            <blockquote className="quote-box">“{row.text}”</blockquote>

            <div className="stack gap-sm mt-sm">
              <p className="small">
                Related incident:{' '}
                {row.incident ? (
                  <Link className="link bold font-mono" to={`/incidents/${row.incident.id}`}>
                    {row.incident.id}
                  </Link>
                ) : 'none (pages were under the target)'}
              </p>

              <h4>Metrics at {row.time}</h4>
              <ul className="observations-list">
                {METRICS.filter((m) => m.key !== 'complaints').map((m) => (
                  <li key={m.key}>{m.title}: {minute ? fmt(minute[m.key]) : '-'} {m.unit}</li>
                ))}
              </ul>

              <p className="muted small mt-sm">
                A complaint reports what a student saw. It is matched to telemetry by time, not treated as a cause.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
