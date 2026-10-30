import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader.jsx';
import { SeverityBadge, StatusBadge } from '../components/common/Badge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METRICS, fmt, minuteOf } from '../api.js';

export default function IncidentDetails() {
  const { id } = useParams();
  const { data } = useApp();
  const inc = data.incidents.find((i) => i.id === id);

  if (!inc) {
    return <EmptyState title="No such incident yet" hint="This session has none with that id, or the replay has not reached it." />;
  }

  // What happened, in time order: built from the minutes, not written by hand.
  const history = [
    [inc.start, `Pages took over ${data.slowMs / 1000} s`],
    [inc.peak.t, `Slowest minute: ${fmt(inc.peak.response_time_ms)} ms`],
    [inc.end, inc.status === 'open' ? 'Still slow when the data ends' : 'Last slow minute'],
  ];
  if (inc.complaints.length) history.push([minuteOf(inc.complaints[0].timestamp), 'First student complaint']);
  history.sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      <PageHeader
        title={inc.title}
        description={`${inc.id} in ${data.name}`}
        actions={
          <>
            {data.logs && (
              <Link className="btn" to={`/logs?incident=${inc.id}`}>
                View related logs
              </Link>
            )}
            <Link className="btn primary" to="/rca">
              Open root cause analysis
            </Link>
          </>
        }
      />

      <div className="grid-3 mb-md">
        <div className="card">
          <span className="label">Severity</span>
          <div className="mt-xs">
            <SeverityBadge level={inc.severity} />
          </div>
        </div>

        <div className="card">
          <span className="label">Status</span>
          <div className="mt-xs">
            <StatusBadge status={inc.status} />
          </div>
        </div>

        <div className="card">
          <span className="label">Time window</span>
          <div className="mt-xs num font-mono">
            {inc.start} – {inc.end} <span className="muted small">({inc.minutes} min)</span>
          </div>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack">
          <section className="card">
            <h3>Summary</h3>
            <p>
              Pages were slow (over {data.slowMs / 1000} s) from {inc.start} to {inc.end}, {inc.minutes} minutes,
              peaking at {fmt(inc.peak.response_time_ms)} ms at {inc.peak.t}. Students sent {inc.complaints.length} complaints
              in that time. The cause is in the root cause analysis.
            </p>
          </section>

          <section className="card">
            <h3>What changed: 15 min before → during</h3>
            <ul className="symptoms-plain-list">
              {METRICS.map((m) => (
                <li key={m.key}>
                  {m.title}: {inc.before ? fmt(inc.before[m.key]) : '-'} → {fmt(inc.during[m.key])} {m.unit}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <h3>Incident history</h3>
          <ol className="timeline-flow">
            {history.map(([t, e]) => (
              <li key={t + e}>
                <span className="num font-mono muted small">{t}</span>
                <p>{e}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
