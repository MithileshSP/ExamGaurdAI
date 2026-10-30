import { Outlet } from 'react-router-dom';
import NavBar from './NavBar.jsx';
import Topbar from './Topbar.jsx';
import Toasts from './Toasts.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function Layout() {
  const { data, error } = useApp();
  // Pages only render once the session's data is here, so they never check for it.
  let body = <Outlet />;
  if (error) body = <EmptyState title="The backend is not answering" hint={`${error.message}. Start uvicorn, then reload this page.`} />;
  else if (!data) body = (
    <div className="skeleton" aria-label="Loading session">
      <div /><div /><div />
    </div>
  );
  return (
    <>
      <div className="masthead">
        <NavBar />
        <Topbar />
      </div>
      <main className="content">{body}</main>
      <Toasts />
    </>
  );
}
