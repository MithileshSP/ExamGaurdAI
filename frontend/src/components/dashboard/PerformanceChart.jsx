import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext.jsx';

const INK = { grid: '#1A2B48', tick: '#7F93B5', line: '#34D3BE', alarm: '#FF4F5E', target: '#FFB547' };

// One metric over the minutes in view. Incidents are red bands behind the line;
// response time also gets a dashed line at the 1 s target. During a replay the
// axis keeps every minute and the line stops at the clock, so it grows as it plays.
export function MiniChart({ def, height = 170 }) {
  const { data, view } = useApp();
  const rows = data.minutes.slice(view.from, view.to + 1).map((t, i) => data.series[view.from + i] ?? { t });
  // Only the part of each incident that falls inside the view.
  const bands = data.incidents
    .map((inc) => [Math.max(inc.first, view.from), Math.min(inc.last, view.to)])
    .filter(([first, last]) => first <= last);
  const replaying = data.upto < data.end;

  return (
    <div className="chart">
      <h4>{def.title} {def.unit && <span className="muted">{def.unit}</span>}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: INK.tick }} minTickGap={40} stroke={INK.grid} />
          <YAxis tick={{ fontSize: 11, fill: INK.tick }} stroke={INK.grid} />
          <Tooltip
            contentStyle={{ background: '#101D33', border: '1px solid #22355A', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#E8EEF8' }} itemStyle={{ color: INK.line }}
            formatter={(v) => [`${v} ${def.unit}`, def.title]}
            labelFormatter={(l) => `At ${l}`}
          />
          {/* A one-minute incident has no width as a band, so it is drawn as a line. */}
          {bands.map(([first, last]) => first === last
            ? <ReferenceLine key={first} x={data.minutes[first]} stroke={INK.alarm} strokeOpacity={0.5} />
            : <ReferenceArea key={first} x1={data.minutes[first]} x2={data.minutes[last]}
                             fill={INK.alarm} fillOpacity={0.16} />
          )}
          {def.key === 'response_time_ms' && (
            <ReferenceLine y={data.slowMs} stroke={INK.target} strokeDasharray="4 4" strokeOpacity={0.7} />
          )}
          {replaying && data.upto >= view.from && data.upto <= view.to && (
            <ReferenceLine x={data.minutes[data.upto]} stroke="#E8EEF8" strokeOpacity={0.5} />
          )}
          <Line dataKey={def.key} stroke={INK.line} strokeWidth={1.6} dot={false}
                isAnimationActive={!replaying} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformanceChart({ defs }) {
  return <div className="chart-grid">{defs.map((d) => <MiniChart key={d.key} def={d} />)}</div>;
}
