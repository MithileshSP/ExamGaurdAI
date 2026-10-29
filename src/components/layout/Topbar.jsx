import { Clock } from 'lucide-react';
import { useApp, ranges } from '../../context/AppContext.jsx';

export default function Topbar() {
  const { range, setRange } = useApp();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="env-title">Exam Portal — Fall 2026</span>
        <div className="status-indicator-badge">
          <span className="status-dot dot-crit" />
          <span>Degraded performance</span>
        </div>
        <span className="topbar-meta">
          <Clock size={12} className="muted" />
          <span>10:29 UTC</span>
        </span>
      </div>

      <div className="topbar-right">
        <div className="seg-control" role="group" aria-label="Time range selector">
          {ranges.map((r) => (
            <button
              key={r.min}
              className={`seg-btn ${r.min === range.min ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="user-profile-pill">
          <div className="avatar">AD</div>
          <span className="user-name">Ops Admin</span>
        </div>
      </div>
    </header>
  );
}
