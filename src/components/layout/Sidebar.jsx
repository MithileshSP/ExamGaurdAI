import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Siren,
  Workflow,
  ScrollText,
  Activity,
  MessageSquareWarning,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

const groups = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Investigation',
    items: [
      { to: '/incidents', label: 'Incidents', icon: Siren, badge: '3' },
      { to: '/rca', label: 'Root cause analysis', icon: Workflow },
      { to: '/logs', label: 'Logs explorer', icon: ScrollText },
      { to: '/metrics', label: 'Metrics', icon: Activity },
      { to: '/complaints', label: 'Student complaints', icon: MessageSquareWarning, badge: '5' },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" className="brand-logo-svg">
      <path d="M16 2 4 7v8c0 7.5 5 12.7 12 15 7-2.3 12-7.5 12-15V7L16 2Z" fill="#14B8A6" />
      <path
        d="M8 16h4l2-5 3 10 2-5h5"
        fill="none"
        stroke="#042F2C"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const { collapsed, setCollapsed } = useApp();

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
      <div className="brand">
        <Logo />
        <div className="brand-text">
          <strong>ExamGuard AI</strong>
          <span>Incident Diagnostics</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {groups.map((g) => (
          <div key={g.title} className="nav-group">
            <p className="nav-title">{g.title}</p>
            {g.items.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={label}
              >
                <Icon size={15} className="nav-icon" />
                <span className="nav-label">{label}</span>
                {badge && <span className="nav-badge">{badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="nav-link collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          <span className="nav-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
