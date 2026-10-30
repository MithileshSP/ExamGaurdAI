import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { useLive } from '../../context/LiveContext.jsx';

const PAGES = [
  { to: '/', label: 'Dashboard' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/rca', label: 'Root cause' },
  { to: '/logs', label: 'Apache log' },
  { to: '/metrics', label: 'Metrics' },
  { to: '/complaints', label: 'Complaints' },
  { to: '/live', label: 'Live' },
];

export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 4 7v8c0 7.5 5 12.7 12 15 7-2.3 12-7.5 12-15V7L16 2Z" fill="#FFA028" />
      <path d="M8 16h4l2-5 3 10 2-5h5" fill="none" stroke="#000" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The function keys across the top, one per page, like a terminal keyboard.
// Pressing 1 to 7 opens that page, unless the user is typing in a box.
export default function NavBar() {
  const { data } = useApp();
  const { live } = useLive();
  const navigate = useNavigate();
  // Counts are what the session holds up to the replay clock.
  const counts = { '/incidents': data?.incidents.length, '/complaints': data?.complaints.length };

  useEffect(() => {
    function onKey(e) {
      const page = PAGES[Number(e.key) - 1];
      if (!page || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea')) return;
      navigate(page.to);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <nav className="navbar" aria-label="Pages">
      <div className="brand">
        <Logo />
        <strong>ExamGuard</strong>
      </div>
      {PAGES.map(({ to, label }, i) => (
        <NavLink key={to} to={to} end={to === '/'}
                 className={({ isActive }) => `nav-key ${isActive ? 'active' : ''}`}>
          <kbd>{i + 1}</kbd>
          {label}
          {counts[to] > 0 && <span className="nav-count">{counts[to]}</span>}
          {to === '/live' && live?.feeding && <span className="live-dot" aria-label="streaming" />}
        </NavLink>
      ))}
    </nav>
  );
}
