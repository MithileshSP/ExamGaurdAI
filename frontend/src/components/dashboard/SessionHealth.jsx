import { useApp } from '../../context/AppContext.jsx';
import { fmt } from '../../api.js';

// The session so far in five numbers: how much of it was slow, and how badly.
// Like every panel, it only counts minutes up to the replay clock.
export default function SessionHealth() {
  const { data } = useApp();
  const { series, slowMs, incidents, complaints } = data;
  const slow = series.filter((m) => m.response_time_ms > slowMs).length;
  const worst = series.reduce((a, b) => (b.response_time_ms > a.response_time_ms ? b : a));
  const longest = incidents.reduce((a, b) => (!a || b.minutes > a.minutes ? b : a), null);

  const items = [
    ['Under target', `${((100 * (series.length - slow)) / series.length).toFixed(1)}%`],
    ['Slow minutes', `${fmt(slow)} of ${fmt(series.length)}`],
    ['Worst minute', `${fmt(worst.response_time_ms)} ms at ${worst.t}`],
    ['Longest slowdown', longest ? `${longest.minutes} min, ${longest.id}` : 'none'],
    ['Complaints', fmt(complaints.length)],
  ];

  return (
    <dl className="health">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="label">{label}</dt>
          <dd className="num">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
