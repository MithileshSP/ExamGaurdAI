import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { SeverityBadge } from '../common/Badge.jsx';
import { series } from '../../data/mockMetrics.js';

export default function MetricCard({ m }) {
  const key = m.key === 'students' || m.key === 'errors' ? 'response' : m.key;
  const data = series.slice(-40);

  return (
    <article className="card metric-card">
      <div className="metric-header">
        <span className="metric-label">{m.label}</span>
        <SeverityBadge level={m.status} />
      </div>

      <div className="metric-value-wrap">
        <span className="metric-val num font-mono">
          {m.value}
          {m.unit && <small className="metric-unit">{m.unit}</small>}
        </span>
      </div>

      <div className="metric-change-line">
        <span className="metric-change">{m.change}</span>
      </div>

      <div className="metric-sub-meta">
        <span>{m.trend} · {m.baseline}</span>
      </div>

      <div className="metric-sparkline" aria-hidden="true">
        <ResponsiveContainer width="100%" height={32}>
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Area
              dataKey={key}
              stroke="#64748B"
              fill="#64748B"
              fillOpacity={0.04}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
