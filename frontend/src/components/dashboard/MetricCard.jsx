import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { SeverityBadge } from '../common/Badge.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmt } from '../../api.js';
import useCountUp from '../../utils/useCountUp.js';

// One metric at the clock's minute, with its peak and median over the minutes in view.
export default function MetricCard({ def }) {
  const { data, view, playing } = useApp();
  const rows = data.series.slice(view.from, view.to + 1);
  const values = rows.map((row) => row[def.key]).sort((a, b) => a - b);
  const now = data.series[data.upto][def.key];
  const shown = useCountUp(now, playing ? 100 : 500);
  // Only response time has a real target: high above it, critical from 3x.
  const level = now >= 3 * data.slowMs ? 'critical' : now > data.slowMs ? 'high' : 'normal';
  const isResponse = def.key === 'response_time_ms';

  return (
    <article className={`metric ${isResponse ? `metric-${level}` : ''}`}>
      <div className="metric-head">
        <h3>{def.title}</h3>
        {isResponse && <SeverityBadge level={level} />}
      </div>
      <div className="metric-value num">
        {fmt(shown)}
        {def.unit && <small>{def.unit}</small>}
      </div>
      <p className="metric-sub num">
        <span>peak <b>{fmt(values.at(-1))}</b></span>
        <span>median <b>{fmt(values[Math.floor(values.length / 2)])}</b></span>
      </p>
      <div className="metric-spark" aria-hidden="true">
        <ResponsiveContainer width="100%" height={34}>
          <AreaChart data={rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Area dataKey={def.key} stroke="#34D3BE" fill="#34D3BE" fillOpacity={0.08}
                  strokeWidth={1.4} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
