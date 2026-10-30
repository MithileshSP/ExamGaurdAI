import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext.jsx';

// The colours of global.css, written out: recharts sets them as SVG attributes, not CSS.
// Response time, the symptom everyone watches, is the only amber line.
export const INK = {
  panel: '#000000', grid: '#1A1A1A', tick: '#8F8F8F', text: '#EDEDED',
  key: '#FFA028', line: '#A8A8A8', alarm: '#FF4040', target: '#FFE14D',
};

// One line over some minutes. rows: one object per minute with `t` ("12:50").
// bands: [first t, last t] of each incident, drawn as red bands behind the line.
// target: a dashed line at that value. cursor: the t to mark with a thin line.
export function Chart({ rows, dataKey, title, unit, bands = [], target, cursor, height, xAxis, animate = true }) {
  const stroke = dataKey === 'response_time_ms' ? INK.key : INK.line;
  return (
    <div className="chart">
      <h4>{title} {unit && <span className="muted">{unit}</span>}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="t" hide={!xAxis} tick={{ fontSize: 11, fill: INK.tick }} minTickGap={40} stroke={INK.grid} />
          {/* A fixed width keeps every chart's plot lined up with the ones above it. */}
          <YAxis width={44} tickCount={3} tick={{ fontSize: 11, fill: INK.tick }} stroke={INK.grid} />
          <Tooltip
            contentStyle={{ background: INK.panel, border: `1px solid ${stroke}`, borderRadius: 0, fontSize: 12 }}
            labelStyle={{ color: INK.text }} itemStyle={{ color: stroke }}
            formatter={(v) => [`${v} ${unit}`, title]}
            labelFormatter={(l) => `At ${l}`}
          />
          {/* A one-minute incident has no width as a band, so it is drawn as a line. */}
          {bands.map(([first, last]) => first === last
            ? <ReferenceLine key={first} x={first} stroke={INK.alarm} strokeOpacity={0.5} />
            : <ReferenceArea key={first} x1={first} x2={last} fill={INK.alarm} fillOpacity={0.12} />
          )}
          {target && <ReferenceLine y={target} stroke={INK.target} strokeDasharray="4 4" strokeOpacity={0.7} />}
          {cursor && <ReferenceLine x={cursor} stroke={INK.text} strokeOpacity={0.5} />}
          <Line dataKey={dataKey} stroke={stroke} strokeWidth={1.6} dot={false}
                isAnimationActive={animate} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// One metric of the session over the minutes in view. Response time also gets
// a dashed line at the 1 s target. During a replay the axis keeps every minute
// and the line stops at the clock, so it grows as it plays.
export function MiniChart({ def, height = 170, xAxis = true }) {
  const { data, view } = useApp();
  const rows = data.minutes.slice(view.from, view.to + 1).map((t, i) => data.series[view.from + i] ?? { t });
  // Only the part of each incident that falls inside the view.
  const bands = data.incidents
    .map((inc) => [Math.max(inc.first, view.from), Math.min(inc.last, view.to)])
    .filter(([first, last]) => first <= last)
    .map(([first, last]) => [data.minutes[first], data.minutes[last]]);
  const replaying = data.upto < data.end;
  const inView = data.upto >= view.from && data.upto <= view.to;
  return (
    <Chart rows={rows} dataKey={def.key} title={def.title} unit={def.unit} bands={bands}
           target={def.key === 'response_time_ms' && data.slowMs}
           cursor={replaying && inView && data.minutes[data.upto]}
           height={height} xAxis={xAxis} animate={!replaying} />
  );
}

// Every metric stacked on one shared time axis, so a change in one lines up with
// the others. Only the bottom chart draws the times, which take 30 px of its height.
export default function PerformanceChart({ defs }) {
  return (
    <div className="timeline">
      {defs.map((d, i) => {
        const last = i === defs.length - 1;
        return <MiniChart key={d.key} def={d} height={last ? 94 : 64} xAxis={last} />;
      })}
    </div>
  );
}
