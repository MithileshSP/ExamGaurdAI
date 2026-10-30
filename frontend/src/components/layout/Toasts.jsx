import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLive } from '../../context/LiveContext.jsx';

const SECONDS = { alarm: 12, warn: 8, ok: 6 }; // how long each kind stays up

function Toast({ toast, onClose, linkToLive }) {
  useEffect(() => {
    const timer = setTimeout(onClose, SECONDS[toast.level] * 1000);
    return () => clearTimeout(timer);
  }, []); // one timer, set when the toast appears

  return (
    <div className={`toast toast-${toast.level}`} role={toast.level === 'alarm' ? 'alert' : 'status'}>
      <div className="toast-head">
        <span className="num">{toast.t}</span>
        <strong>{toast.title}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Dismiss">×</button>
      </div>
      <p>{toast.detail}</p>
      {linkToLive && <Link className="link small" to="/live">Open Live</Link>}
    </div>
  );
}

// The live stream's alerts, in the corner of every page. They go away by
// themselves and never block the page; the Live page keeps the full list.
export default function Toasts() {
  const { toasts, dismiss } = useLive();
  const { pathname } = useLocation();
  return (
    <div className="toasts" aria-label="Live alerts">
      {toasts.map((t) => (
        <Toast key={t.key} toast={t} onClose={() => dismiss(t.key)} linkToLive={pathname !== '/live'} />
      ))}
    </div>
  );
}
