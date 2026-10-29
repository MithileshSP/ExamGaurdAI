import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader.jsx';
import { SeverityBadge, StatusBadge, Chip } from '../components/common/Badge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { incidents } from '../data/mockIncidents.js';

export default function IncidentDetails() {
  const { id } = useParams();
  const inc = incidents.find((i) => i.id === id);

  if (!inc) {
    return <EmptyState title="Incident not found" hint="Return to the incident catalog." />;
  }

  return (
    <>
      <PageHeader
        title={inc.title}
        description={`${inc.id} · ${inc.service}`}
        actions={
          <>
            <Link className="btn" to={`/logs?incident=${inc.id}`}>
              View related logs
            </Link>
            <Link className="btn" to="/reports">
              Open report
            </Link>
            <Link className="btn primary" to={`/rca/${inc.id}`}>
              Open root cause analysis
            </Link>
          </>
        }
      />

      <div className="grid-3 mb-md">
        <div className={`card rail-${inc.severity}`}>
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
          <span className="label">Active Window</span>
          <div className="mt-xs num font-mono">
            {inc.started} – {inc.ended ?? 'ongoing'} <span className="muted small">({inc.duration})</span>
          </div>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack">
          <section className="card">
            <h3>Summary</h3>
            <p>{inc.summary}</p>
            <div className="row gap mt-sm">
              <Chip tone="warn">{inc.hypothesisState}</Chip>
              <span className="small">
                {inc.hypothesis} · confidence: <strong>{inc.confidence}</strong>
              </span>
            </div>
          </section>

          <section className="card">
            <h3>Key symptoms</h3>
            <ul className="symptoms-plain-list">
              {inc.symptoms.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <h3>Incident history</h3>
          <ol className="timeline-flow">
            {inc.history.map(([t, e]) => (
              <li key={t + e}>
                <span className="num font-mono muted small">{t} UTC</span>
                <p>{e}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
