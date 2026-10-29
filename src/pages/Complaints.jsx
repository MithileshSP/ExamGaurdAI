import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader.jsx';
import { Chip } from '../components/common/Badge.jsx';
import { complaints } from '../data/mockComplaints.js';

export default function Complaints() {
  const [sel, setSel] = useState(complaints[0]);
  const cats = Object.entries(
    complaints.reduce((a, c) => ({ ...a, [c.category]: (a[c.category] || 0) + 1 }), {})
  );

  return (
    <>
      <PageHeader
        title="Student complaints"
        description="What students report, correlated next to infrastructure observations."
      />

      <div className="grid-3 mb-md">
        <div className="card">
          <span className="label">Total complaints</span>
          <div className="stat font-mono">{complaints.length}</div>
        </div>

        <div className="card">
          <span className="label">Linked to an incident</span>
          <div className="stat font-mono text-warn">
            {complaints.filter((c) => c.incident).length}
          </div>
        </div>

        <div className="card">
          <span className="label">Category distribution</span>
          <p className="small mt-xs">
            {cats.map(([c, n]) => `${c}: ${n}`).join(' · ')}
          </p>
        </div>
      </div>

      <div className="grid-main">
        <div className="card flush">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Time</th>
                  <th style={{ width: '150px' }}>Category</th>
                  <th>Complaint</th>
                  <th style={{ width: '100px' }}>Incident</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    className={`click ${sel.id === c.id ? 'sel-row' : ''}`}
                    onClick={() => setSel(c)}
                  >
                    <td className="num font-mono">{c.time}</td>
                    <td>
                      <span className="complaint-cat">{c.category}</span>
                    </td>
                    <td>{c.text}</td>
                    <td className="num font-mono code-link">{c.incident}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card complaint-aside">
          <h3>Complaint {sel.id}</h3>
          <blockquote className="quote-box">“{sel.text}”</blockquote>

          <div className="stack gap-sm mt-sm">
            <p className="small">
              Category: <strong>{sel.category}</strong>{' '}
              <Chip>{Math.round(sel.confidence * 100)}% confidence</Chip>
            </p>

            <p className="small">
              Related incident:{' '}
              <Link className="link bold font-mono" to={`/incidents/${sel.incident}`}>
                {sel.incident}
              </Link>
            </p>

            <h4>Related telemetry observations</h4>
            <ul className="observations-list">
              {sel.observations.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>

            <p className="muted small mt-sm">
              A complaint reports an end-user symptom. It is correlated with telemetry, not treated as an independent root cause.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
