import { useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import IncidentTable from '../components/incidents/IncidentTable.jsx';
import { useApp } from '../context/AppContext.jsx';
import { statusLabel } from '../utils/status.js';

const tabs = ['all', 'open', 'resolved'];

export default function Incidents() {
  const { incidents, slowMs } = useApp().data;
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const rows = incidents.filter(
    (i) =>
      (tab === 'all' || i.status === tab) &&
      `${i.id} ${i.title}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Incidents"
        description={`Runs of minutes when pages took over ${slowMs / 1000} s; at most 2 normal minutes in between still count as one incident. Select one for its evidence.`}
      />

      <div className="toolbar">
        <div className="seg-control">
          {tabs.map((t) => (
            <button
              key={t}
              className={`seg-btn ${t === tab ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {statusLabel[t] ?? 'All'}
            </button>
          ))}
        </div>

        <label className="search-box">
          <Search size={15} className="muted" />
          <input
            placeholder="Search incidents"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      <div className="card flush">
        <IncidentTable rows={rows} />
      </div>
    </>
  );
}
