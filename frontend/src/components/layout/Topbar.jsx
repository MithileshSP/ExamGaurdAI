import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pause, Play, Sparkles, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { UPLOAD_COLUMNS, uploadCsv } from '../../api.js';

export default function Topbar() {
  const { sessions, session, setSession, addSessions, data, view, setViewLabel, playing, replay, analysis } = useApp();
  const replaying = data && data.upto < data.end;
  const onLive = useLocation().pathname === '/live'; // the Live page has its own minutes, so no time range
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // A CSV picked from disk becomes a new session, which opens at once.
  async function onFile(e) {
    const file = e.target.files[0];
    e.target.value = ''; // so picking the same file again still uploads it
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await addSessions(await uploadCsv(file));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <header className="topbar">
      <select className="select-input" aria-label="Exam session" value={session ?? ''}
              onChange={(e) => setSession(e.target.value)}>
        {sessions.map(({ name }) => <option key={name} value={name}>{name}</option>)}
      </select>

      {/* The real file input is hidden but still focusable; the label is what you see and click. */}
      <label className="btn btn-xs upload-btn" title={`CSV columns: ${UPLOAD_COLUMNS}`}>
        <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload CSV'}
        <input type="file" accept=".csv,text/csv" className="visually-hidden"
               onChange={onFile} disabled={uploading} />
      </label>
      {uploadError && (
        <span className="inline-error" role="alert">
          {uploadError}
          <button className="icon-btn" onClick={() => setUploadError(null)} aria-label="Dismiss">×</button>
        </span>
      )}

      {/* Which minutes every chart shows: the whole session, or one incident with 30 min either side. */}
      {data && !onLive && (
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
