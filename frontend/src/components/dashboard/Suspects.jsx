import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { METRICS, fmt } from '../../api.js';

// Response time is the symptom; complaints and errors are what people get when the
// portal fails, whatever the cause. So none of the three can be a suspect.
const SYMPTOMS = ['response_time_ms', 'complaints', 'error_count'];
const CANDIDATES = METRICS.filter((m) => !SYMPTOMS.includes(m.key));

// Pearson correlation: 1 when two series rise and fall together, -1 when one
// rises as the other falls, 0 when they are unrelated (or one never changes).
function correlation(xs, ys) {
  const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  });
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

// Percent change from before to during: Infinity when it was 0 before, null
// when the incident starts the session and there is no before.
function change(before, during) {
  if (before == null) return null;
  if (before === 0) return during > 0 ? Infinity : 0;
  return ((during - before) / before) * 100;
}
const showChange = (pct) => (pct == null ? '-' : pct === Infinity ? 'new' : `${pct > 0 ? '+' : ''}${fmt(pct)}%`);

// The possible causes, ranked by how much each changed from the 15 minutes before
// the incident to during it. In a traffic surge everything rises together, so
// correlation alone cannot rank them; the size of the change can. r is shown too.
export default function Suspects({ inc }) {
  const { data } = useApp();
  const rows = data.series.slice(Math.max(inc.first - 30, 0), inc.last + 31);
  const response = rows.map((row) => row.response_time_ms);
  const ranked = CANDIDATES
    .map((m) => {
      const before = inc.before?.[m.key];
      const during = inc.during[m.key];
      return { ...m, before, during, pct: change(before, during), r: correlation(rows.map((row) => row[m.key]), response) };
    })
    .sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity));
  // A full bar is the biggest rise, or +100% if nothing rose that much, so tiny
  // changes keep tiny bars.
  const scale = Math.max(...ranked.map((s) => (Number.isFinite(s.pct) ? s.pct : 0)), 100);
  const width = (pct) => (pct === Infinity ? 100 : (Math.max(pct ?? 0, 0) / scale) * 100);
  const nothingMoved = ranked[0].pct != null && ranked[0].pct < 10;

  return (
    <section className="card flush">
      <div className="panel-head">
        <h3>Suspects</h3>
        <p className="muted small">
          The possible causes, ranked by how much each changed from the 15 minutes before {inc.id} to during it.
          r is how closely it rose and fell with response time. A lead, not proof.
        </p>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>15 min before → during</th>
              <th style={{ width: '30%' }}>Change</th>
              <th style={{ width: '60px' }}>r</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => (
              <tr key={s.key} className={i === 0 && !nothingMoved ? 'top-suspect' : ''}>
                <td>{s.title}</td>
                <td className="num">
                  {s.before == null ? '-' : fmt(s.before)} → {fmt(s.during)} <span className="muted">{s.unit}</span>
                </td>
                <td>
                  <div className="corr">
                    <span className="corr-bar"><i style={{ width: `${width(s.pct)}%` }} /></span>
                    <span className="num">{showChange(s.pct)}</span>
                  </div>
                </td>
                <td className="num">{s.r.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nothingMoved && (
        <p className="panel-note">
          None of these changed by 10% or more, so the cause is probably outside them.
          {data.logs && <> Check <Link className="link" to={`/logs?incident=${inc.id}`}>the Apache log</Link> for these minutes.</>}
        </p>
      )}
    </section>
  );
}
