import { useApp } from '../../context/AppContext.jsx';
import { fmt } from '../../api.js';
import useCountUp from '../../utils/useCountUp.js';

// One metric's value at the clock's minute: one cell of the quote line.
// Only response time has a real target, so only it changes colour: high above it, critical from 3x.
export default function MetricCard({ def }) {
  const { data, playing } = useApp();
  const now = data.series[data.upto][def.key];
  const shown = useCountUp(now, playing ? 100 : 500);
  const level = def.key !== 'response_time_ms' ? ''
    : now >= 3 * data.slowMs ? 'critical' : now > data.slowMs ? 'high' : '';

  return (
    <article className={`metric ${level && `metric-${level}`}`}>
      <h3>{def.title}</h3>
      <div className="metric-value num">
        {fmt(shown)}
        {def.unit && <small>{def.unit}</small>}
      </div>
    </article>
  );
}
