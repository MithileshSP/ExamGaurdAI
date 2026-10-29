import { Link } from 'react-router-dom';
import { Pause, Play, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export default function Topbar() {
  const { sessions, session, setSession, data, view, setViewLabel, playing, replay, analysis } = useApp();
  const replaying = data && data.upto < data.end;

  return (
    <header className="topbar">
      <select className="select-input" aria-label="Exam session" value={session ?? ''}
              onChange={(e) => setSession(e.target.value)}>
        {sessions.map(({ name }) => <option key={name} value={name}>{name}</option>)}
      </select>

      {/* Which minutes every chart shows: the whole session, or one incident with 30 min either side. */}
      {data && (
        <div className="seg-control" role="group" aria-label="Time range">
          {data.views.map((v) => (
            <button key={v.label} className={`seg-btn ${v.label === view.label ? 'active' : ''}`}
                    onClick={() => setViewLabel(v.label)}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      <div className="topbar-right">
        {analysis?.running && (
          <Link to="/rca" className="pill pill-ai">
            <Sparkles size={13} /> DeepSeek is writing the {analysis.session} report
          </Link>
        )}
        {replaying && (
          <span className={`pill pill-replay ${playing ? 'is-live' : ''}`}>
            <span className="live-dot" />
            Replay at <strong className="num">{data.minutes[data.upto]}</strong>
            <button className="icon-btn" onClick={playing ? replay.pause : replay.resume}
                    aria-label={playing ? 'Pause replay' : 'Continue replay'}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </span>
        )}
      </div>
    </header>
  );
}
