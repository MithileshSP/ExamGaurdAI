import { useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import { MiniChart } from '../components/dashboard/PerformanceChart.jsx';
import { useApp } from '../context/AppContext.jsx';
import { METRICS, fmt } from '../api.js';

// One tab per data source, as in the problem statement: server, network, complaints.
const tabs = ['Network', 'Server', 'Students'];

export default function MetricsExplorer() {
  const [tab, setTab] = useState('Network');
  const { data, view } = useApp();
  const rows = data.series.slice(view.from, view.to + 1);
  const defs = METRICS.filter((m) => m.source === tab);

  const stat = (k) => {
    const v = rows.map((d) => d[k]);
    return { peak: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length };
  };

  return (
    <>
      <PageHeader
        title="Metrics"
        description="Each data source on its own, over the minutes picked in the top bar."
      />

      <div className="seg-control mb-md">
        {tabs.map((t) => (
          <button
            key={t}
            className={`seg-btn ${t === tab ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid-4 mb-md">
        {defs.map((d) => {
          const s = stat(d.key);
          return (
            <div key={d.key} className="card">
              <span className="label">{d.title}</span>
              <div className="stat num">
                {fmt(s.peak)} <small>{d.unit}</small>
              </div>
              <p className="metric-sub num">
                <span>peak</span><span>average <b>{fmt(s.avg)}</b></span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        {defs.map((d) => (
          <MiniChart key={d.key} def={d} height={200} />
        ))}
      </div>
    </>
  );
}
