import { useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import IncidentTable from '../components/incidents/IncidentTable.jsx';
import { incidents } from '../data/mockIncidents.js';

const tabs = ['all', 'open', 'investigating', 'resolved'];

export default function Incidents() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const rows = incidents.filter(
    (i) =>
      (tab === 'all' || i.status === tab) &&
      `${i.id} ${i.title} ${i.service} ${i.hypothesis}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Select an incident to view diagnosis, evidence, and telemetry timeline."
      />

      <div className="toolbar">
        <div className="seg-control">
          {tabs.map((t) => (
            <button
              key={t}
              className={`seg-btn ${t === tab ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <label className="search-box">
          <Search size={15} className="muted" />
          <input
            placeholder="Search incidents or services"
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
