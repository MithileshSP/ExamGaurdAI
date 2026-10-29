import { useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import { MiniChart } from '../components/dashboard/PerformanceChart.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { series, chartDefs } from '../data/mockMetrics.js';
import { useApp } from '../context/AppContext.jsx';

const D = Object.fromEntries(chartDefs.map((d) => [d.key, d]));
const extra = {
  p95: { key: 'p95', title: 'p95 response time', unit: 'ms', color: '#B45309' },
  p99: { key: 'p99', title: 'p99 response time', unit: 'ms', color: '#DC2626' },
};

const tabs = {
  Overview: [D.response, D.db, D.cpu, D.memory],
  CPU: [D.cpu],
  Memory: [D.memory],
  Database: [D.db],
  Requests: [D.response, extra.p95, extra.p99],
  Network: [],
};

const missing = {
  Memory: ['Available memory', 'Swap activity'],
  Database: ['Connection-pool saturation', 'Slow-query count'],
  Network: ['Throughput (Mbps)', 'Packet loss', 'Interface errors'],
  Requests: ['Per-endpoint request rate'],
};

export default function MetricsExplorer() {
  const [tab, setTab] = useState('Overview');
  const { range } = useApp();
  const data = series.slice(-range.min);

  const stat = (k) => {
    const v = data.map((d) => d[k] || 0);
    return {
      cur: v.at(-1),
      peak: Math.max(...v),
      avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    };
  };

  const currentCharts = tabs[tab] || [];

  return (
    <>
      <PageHeader
        title="Metrics"
        description="Time-series telemetry from the exam application cluster."
      />

      <div className="seg-control mb-md">
        {Object.keys(tabs).map((t) => (
          <button
            key={t}
            className={`seg-btn ${t === tab ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {currentCharts.length === 0 && (
        <div className="card mb-md">
          <EmptyState
            title="No data available"
            hint="This data source does not collect hardware network metrics."
          />
        </div>
      )}

      {tab !== 'Overview' && currentCharts.length > 0 && (
        <div className="grid-3 mb-md">
          {currentCharts.slice(0, 3).map((d) => {
            const s = stat(d.key);
            return (
              <div key={d.key} className="card">
                <span className="label">{d.title}</span>
                <div className="stat font-mono" style={{ color: d.color }}>
                  {s.cur} <small>{d.unit}</small>
                </div>
                <p className="muted small font-mono mt-xs">
                  Peak: {s.peak} {d.unit} · Average: {s.avg} {d.unit}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid-2">
        {currentCharts.map((d) => (
          <MiniChart key={d.key} def={d} data={data} height={200} />
        ))}
      </div>

      {missing[tab] && (
        <div className="card mt-md gap-card">
          <h4>Not collected in telemetry stream</h4>
          <ul className="plain-bullet-list">
            {missing[tab].map((m) => (
              <li key={m}>
                <span>{m}:</span> <span className="muted">No data available</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
