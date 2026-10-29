import { useState } from 'react';
import { Download } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import { reports } from '../data/mockReports.js';

const PlainList = ({ items }) => (
  <ul className="plain-bullet-list">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

export default function Reports() {
  const [r, setR] = useState(reports[0]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Post-investigation incident documentation and prevention items."
        actions={
          <button className="btn primary" onClick={() => window.print()}>
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        }
      />

      <div className="grid-side">
        <div className="stack">
          {reports.map((x) => (
            <button
              key={x.id}
              className={`card report-nav-card ${x.id === r.id ? 'active' : ''}`}
              onClick={() => setR(x)}
            >
              <strong>{x.title}</strong>
              <span className="muted small font-mono">{x.id}</span>
            </button>
          ))}
        </div>

        <article className="card report-view">
          <div className="report-title-strip">
            <h2>Incident report: {r.title}</h2>
            <span className="muted font-mono small">Reference: {r.id}</span>
          </div>

          <div className="report-content-body">
            <h3>Impact</h3>
            <p>{r.impact}</p>

            <h3>Primary hypothesis</h3>
            <p>{r.hypothesis}</p>

            <h3>Supporting evidence</h3>
            <PlainList items={r.evidence} />

            <h3>Resolution</h3>
            <p>{r.resolution}</p>

            <h3>Prevention</h3>
            <PlainList items={r.prevention} />

            <h3>Remaining uncertainties</h3>
            <PlainList items={r.uncertainties} />
          </div>
        </article>
      </div>
    </>
  );
}
