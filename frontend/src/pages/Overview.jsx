import { Link } from 'react-router-dom';
import ExamClock from '../components/dashboard/ExamClock.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import PerformanceChart from '../components/dashboard/PerformanceChart.jsx';
import Suspects from '../components/dashboard/Suspects.jsx';
import Verdict from '../components/dashboard/Verdict.jsx';
import IncidentEvidence from '../components/dashboard/IncidentEvidence.jsx';
import IncidentTable from '../components/incidents/IncidentTable.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METRICS } from '../api.js';

export default function Overview() {
  const { data, view } = useApp();
  // The incident to explain: the one picked in the time range, or else the latest.
  const focus = data.incidents.find((i) => i.id === view.label) ?? data.incidents.at(-1);

  return (
    <>
      <ExamClock />

      <div className="metric-grid">
        {METRICS.map((m) => <MetricCard key={m.key} def={m} />)}
      </div>

      <div className="section-head">
        <h2>Server, network and complaints on one timeline</h2>
        <p className="muted">
          {view.label}. Red bands are incidents, the dashed line is the {data.slowMs / 1000} s target.
        </p>
      </div>
      <PerformanceChart defs={METRICS} />

      {focus && (
        <>
          <div className="section-head">
            <h2>Why {focus.id} was slow</h2>
            <p className="muted">
              {focus.start}–{focus.end}, {focus.minutes} min.
              {data.incidents.length > 1 && ' Pick another incident in the time range at the top.'}
            </p>
          </div>
          <div className="grid-main">
            <Suspects inc={focus} />
            <div className="stack">
              <Verdict inc={focus} />
              <IncidentEvidence inc={focus} />
            </div>
          </div>
        </>
      )}

      <div className="section-head">
        <h2>Incidents</h2>
        <Link to="/incidents" className="link">All incidents</Link>
      </div>
      <div className="panel flush">
        <IncidentTable compact rows={data.incidents} />
      </div>
    </>
  );
}
