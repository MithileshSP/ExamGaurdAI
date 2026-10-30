import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, masked, minuteOf } from '../../api.js';

// The 3 most common texts, with how often each appears.
function top(texts) {
  const count = {};
  for (const t of texts) count[t] = (count[t] || 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3);
}

function TopList({ items, empty }) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="top-list">
      {items.map(([text, n]) => <li key={text}><b className="num">{fmt(n)}x</b> {text}</li>)}
    </ul>
  );
}

// What the people and the server said during the incident.
export default function IncidentEvidence({ inc }) {
  const { data } = useApp();
  // Apache errors from 5 minutes before the incident to its end, as in the evidence pack.
  const from = data.series[Math.max(inc.first - 5, 0)].t;
  const errors = data.logs && top(data.logs
    .filter((l) => l.level === 'error' && from <= minuteOf(l.timestamp) && minuteOf(l.timestamp) <= inc.end)
    .map((l) => masked(l.message)));

  return (
    <section className="card">
      <h3>What students said</h3>
      <TopList items={top(inc.complaints.map((c) => c.complaint_text))} empty="No complaints during it." />

      <h3 className="mt-md">Top Apache errors</h3>
      {errors
        ? <TopList items={errors} empty="No error lines in these minutes." />
        : <p className="muted small">This session has no Apache log.</p>}

      <p className="small mt-sm">
        <Link className="link" to="/complaints">All complaints</Link>
        {data.logs && <> <span className="muted">or</span> <Link className="link" to={`/logs?incident=${inc.id}`}>its log lines</Link></>}
      </p>
    </section>
  );
}
