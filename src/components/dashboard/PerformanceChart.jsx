import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { series, incidentWindow } from '../../data/mockMetrics.js';
import { useApp } from '../../context/AppContext.jsx';

export function MiniChart({ def, data, height = 180 }) {
  return (
    <div className="card chart-box">
      <div className="chart-header-row">
        <h4>
          {def.title} <span className="muted font-mono small">({def.unit})</span>
        </h4>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            minTickGap={40}
            stroke="#E2E8F0"
          />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} stroke="#E2E8F0" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
            formatter={(v) => [`${v} ${def.unit}`, def.title]}
            labelFormatter={(l) => `Time: ${l} UTC`}
          />
          <ReferenceLine
            x={incidentWindow.from}
            stroke="#DC2626"
            strokeDasharray="3 3"
            strokeWidth={1.2}
          />
          <Line
            dataKey={def.key}
            stroke={def.color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformanceChart({ defs }) {
  const { range } = useApp();
  const data = series.slice(-range.min);

  return (
    <section className="performance-section">
      <div className="chart-legend-row">
        <span className="legend-indicator-line" />
        <span className="small muted">
          Vertical dashed line marks incident detection window (10:10 UTC).
        </span>
      </div>
      <div className="grid-2">{defs.map((d) => <MiniChart key={d.key} def={d} data={data} />)}</div>
    </section>
  );
}
