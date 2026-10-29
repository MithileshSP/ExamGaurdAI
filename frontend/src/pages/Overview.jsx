import { Link } from 'react-router-dom';
import ExamClock from '../components/dashboard/ExamClock.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import PerformanceChart from '../components/dashboard/PerformanceChart.jsx';
import IncidentTable from '../components/incidents/IncidentTable.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METRICS } from '../api.js';

export default function Overview() {
  const { data, view } = useApp();

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
