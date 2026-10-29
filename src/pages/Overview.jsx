import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader.jsx';
import HealthBanner from '../components/dashboard/HealthBanner.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import PerformanceChart from '../components/dashboard/PerformanceChart.jsx';
import IncidentTable from '../components/incidents/IncidentTable.jsx';
import { metricCards, chartDefs } from '../data/mockMetrics.js';
import { incidents } from '../data/mockIncidents.js';

export default function Overview() {
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Current condition of the examination portal and active anomaly detection."
      />

      <HealthBanner />

      <div className="grid-6">
        {metricCards.map((m) => (
          <MetricCard key={m.key} m={m} />
        ))}
      </div>

      <div className="section-head">
        <h2>Performance trends</h2>
        <span className="muted small">Aggregated metrics aligned to active incident window</span>
      </div>
      <PerformanceChart defs={chartDefs} />

      <div className="section-head row between">
        <h2>Active incidents</h2>
        <Link to="/incidents" className="link small">
          View all incidents →
        </Link>
      </div>

      <div className="card flush">
        <IncidentTable compact rows={activeIncidents} />
      </div>
    </>
  );
}
