import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function Layout() {
  const { collapsed } = useApp();
  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
