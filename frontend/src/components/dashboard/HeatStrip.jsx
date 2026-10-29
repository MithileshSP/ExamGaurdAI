import { useApp } from '../../context/AppContext.jsx';

// The exam tape: one thin bar per minute, coloured by how slow pages were.
// Minutes the replay has not reached yet stay blank. Click or drag to move the clock.
export default function HeatStrip() {
  const { data, replay } = useApp();
  const { minutes, series, slowMs, upto, end, incidents } = data;

  const tone = (ms) => (ms > 3 * slowMs ? 'crit' : ms > slowMs ? 'slow' : ms > slowMs / 2 ? 'ok' : 'calm');
  const minuteAt = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.round(Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1) * end);
  };
  const keys = { ArrowLeft: -1, ArrowRight: 1, PageDown: -30, PageUp: 30 };

  return (
    <div className="strip">
      <svg
        className="strip-bars" viewBox={`0 0 ${end + 1} 10`} preserveAspectRatio="none"
        role="slider" tabIndex={0} aria-label="Exam time" aria-valuemin={0} aria-valuemax={end}
        aria-valuenow={upto} aria-valuetext={minutes[upto]}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); replay.seek(minuteAt(e)); }}
        onPointerMove={(e) => { if (e.buttons) replay.seek(minuteAt(e)); }}
        onKeyDown={(e) => {
          if (!(e.key in keys)) return;
          e.preventDefault();
          replay.seek(Math.min(Math.max(upto + keys[e.key], 0), end));
        }}
      >
        {minutes.map((t, i) => (
          <rect key={t} x={i} y={0} width={1.02} height={10}
                className={i <= upto ? `m-${tone(series[i].response_time_ms)}` : 'm-future'} />
        ))}
        {upto < end && <rect className="strip-cursor" x={upto} y={0} width={Math.max(end / 300, 1)} height={10} />}
      </svg>
      <div className="strip-scale num">
        <span>{minutes[0]}</span>
        {incidents.map((inc) => (
          <span key={inc.id} className="strip-mark" style={{ left: `${(inc.first / end) * 100}%` }}>{inc.id}</span>
        ))}
        <span>{minutes[end]}</span>
      </div>
    </div>
  );
}
