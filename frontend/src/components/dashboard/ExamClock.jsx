import { Link, useNavigate } from 'react-router-dom';
import { Pause, Play, RotateCcw, SkipForward, Sparkles } from 'lucide-react';
import HeatStrip from './HeatStrip.jsx';
import SessionHealth from './SessionHealth.jsx';
import { useApp, SPEEDS } from '../../context/AppContext.jsx';
import { fmt } from '../../api.js';

const speedLabel = { 10: '10 min/s', 60: '1 h/s', 300: '5 h/s' };

// The dashboard's hero: the exam clock. It shows the session at one minute, says
// what the portal was doing then, and drives the replay.
export default function ExamClock() {
  const { data, playing, speed, setSpeed, replay, runAnalysis, analysis } = useApp();
  const navigate = useNavigate();
  const { incidents, slowMs, upto, end } = data;
  const now = data.series[upto];
  const atEnd = upto === end;
  const open = incidents.find((i) => i.status === 'open'); // slow at this minute
  // The replay stopped on the first slow minute of an incident.
  const alarm = !playing && incidents.find((i) => i.first === upto);
  const state = alarm ? 'alarm' : open ? 'slow' : 'calm';

  let headline, detail;
  if (alarm) {
    headline = `${alarm.id} detected`;
    detail = `Pages took ${fmt(now.response_time_ms)} ms at ${now.t}, over the ${slowMs / 1000} s target.`;
  } else if (atEnd) {
    headline = 'End of the data';
    detail = incidents.length
      ? `${incidents.length} incident(s) found${open ? `, and ${open.id} is still slow at the end` : ''}. Replay the exam to watch them happen.`
      : `Pages stayed under ${slowMs / 1000} s all session.`;
  } else if (open) {
    headline = `${open.id} in progress`;
    detail = `Pages at ${fmt(now.response_time_ms)} ms, slow for ${open.minutes} min. ${open.complaints.length} complaints so far.`;
  } else {
    headline = 'Portal healthy';
    detail = `Pages at ${fmt(now.response_time_ms)} ms.${incidents.length ? ` Recovered from ${incidents.at(-1).id} at ${incidents.at(-1).end}.` : ''}`;
  }

  function askWhy() {
    navigate('/rca');
    runAnalysis();
  }

  return (
    <section className={`clock clock-${state}`} aria-live="polite">
      <div className="clock-face">
        <div className="clock-time num">{now.t}</div>
        <div className="clock-status">
          <h2>{headline}</h2>
          <p>{detail}</p>
        </div>

        <div className="clock-controls">
          {playing && <button className="btn" onClick={replay.pause}><Pause size={15} /> Pause</button>}
          {!playing && atEnd && <button className="btn primary" onClick={replay.start}><Play size={15} /> Replay the exam</button>}
          {!playing && !atEnd && <button className="btn primary" onClick={replay.resume}><Play size={15} /> Continue</button>}
          {!playing && !atEnd && <button className="btn" onClick={replay.stop}><SkipForward size={15} /> Jump to end</button>}
          {!atEnd && <button className="btn ghost" onClick={replay.start} aria-label="Restart replay"><RotateCcw size={15} /></button>}
          {alarm && (
            <>
              <button className="btn alarm" onClick={askWhy} disabled={analysis?.running}>
                <Sparkles size={15} /> Ask DeepSeek why
              </button>
              <Link className="btn" to={`/incidents/${alarm.id}`}>Open {alarm.id}</Link>
            </>
          )}
          <div className="seg-control" role="group" aria-label="Replay speed">
            {SPEEDS.map((s) => (
              <button key={s} className={`seg-btn ${s === speed ? 'active' : ''}`} onClick={() => setSpeed(s)}>
                {speedLabel[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <HeatStrip />
      <SessionHealth />
    </section>
  );
}
