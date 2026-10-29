import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Siren, Workflow, ScrollText, Activity, MessageSquareWarning, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 4 7v8c0 7.5 5 12.7 12 15 7-2.3 12-7.5 12-15V7L16 2Z" fill="#34D3BE" />
      <path d="M8 16h4l2-5 3 10 2-5h5" fill="none" stroke="#0A1426" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar() {
  const { collapsed, setCollapsed, data } = useApp();
  // Badges count what the session holds up to the replay clock.
  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incidents', label: 'Incidents', icon: Siren, badge: data?.incidents.length },
    { to: '/rca', label: 'Root cause analysis', icon: Workflow },
    { to: '/logs', label: 'Apache log', icon: ScrollText },
    { to: '/metrics', label: 'Metrics', icon: Activity },
    { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning, badge: data?.complaints.length },
  ];

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand">
        <Logo />
        <div className="brand-text">
          <strong>ExamGuard</strong>
          <span>Exam portal incidents</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} title={label}
                   className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={16} />
            <span className="nav-label">{label}</span>
            {badge > 0 && <span className="nav-badge">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      <button className="nav-link collapse-toggle" onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        <span className="nav-label">Collapse</span>
      </button>
    </aside>
  );
}
