import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Overview from './pages/Overview.jsx';
import Incidents from './pages/Incidents.jsx';
import IncidentDetails from './pages/IncidentDetails.jsx';
import RootCauseAnalysis from './pages/RootCauseAnalysis.jsx';
import LogsExplorer from './pages/LogsExplorer.jsx';
import MetricsExplorer from './pages/MetricsExplorer.jsx';
import Complaints from './pages/Complaints.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<IncidentDetails />} />
        <Route path="rca" element={<Navigate to="/rca/INC-001" replace />} />
        <Route path="rca/:id" element={<RootCauseAnalysis />} />
        <Route path="logs" element={<LogsExplorer />} />
        <Route path="metrics" element={<MetricsExplorer />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
