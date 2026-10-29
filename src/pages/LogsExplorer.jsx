import { useState, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { logs } from '../data/mockLogs.js';

export default function LogsExplorer() {
  const [sp, setSp] = useSearchParams();
  const scoped = sp.get('incident');
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('All');
  const [ev, setEv] = useState('All');
  const [src, setSrc] = useState('All');
  const [open, setOpen] = useState(null);

  const rows = logs.filter(
    (l) =>
      (!scoped || (l.time >= '10:10:00' && l.level === 'ERROR')) &&
      (level === 'All' || l.level === level) &&
      (ev === 'All' || l.eventId === ev) &&
      (src === 'All' || l.source === src) &&
      `${l.content} ${l.template}`.toLowerCase().includes(q.toLowerCase())
  );

  const errs = rows.filter((l) => l.level === 'ERROR');
  const count = {};
  errs.forEach((l) => (count[l.eventId] = (count[l.eventId] || 0) + 1));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];

  const Sel = ({ v, set, opts, label }) => (
    <label className="filter-select-label">
      <span>{label}</span>
      <select value={v} onChange={(e) => set(e.target.value)} className="select-input">
        {['All', ...opts].map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <PageHeader
        title="Logs explorer"
        description="Apache web server records parsed via Drain log templates."
      />

      {scoped && (
        <div className="scope-banner card">
          <span>
            Scoped to incident <strong>{scoped}</strong> (showing error entries from 10:10 UTC).
          </span>
          <button className="btn btn-xs" onClick={() => setSp({})}>
            Clear scope
          </button>
        </div>
      )}

      <div className="grid-4 mb-md">
        {[
          ['Entries shown', rows.length],
          ['Error entries', errs.length],
          ['Distinct event types', new Set(rows.map((l) => l.eventId)).size],
          ['Most frequent error', top ? `${top[0]} (${top[1]})` : 'None'],
        ].map(([l, v]) => (
          <div key={l} className="card">
            <span className="label">{l}</span>
            <div className="stat font-mono">{v}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={15} className="muted" />
          <input
            placeholder="Search message or template pattern"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <Sel label="Level" v={level} set={setLevel} opts={['ERROR', 'NOTICE']} />
        <Sel label="Event" v={ev} set={setEv} opts={['E1', 'E2', 'E3', 'E4', 'E5', 'E6']} />
        <Sel label="Source" v={src} set={setSrc} opts={['web-01', 'web-02']} />
      </div>

      <div className="card flush">
        {rows.length ? (
          <div className="table-wrap tall">
            <table className="table font-mono">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}></th>
                  <th style={{ width: '90px' }}>Time</th>
                  <th style={{ width: '80px' }}>Level</th>
                  <th style={{ width: '70px' }}>Event</th>
                  <th style={{ width: '90px' }}>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 120).map((l) => (
                  <Fragment key={l.lineId}>
                    <tr
                      className="click"
                      onClick={() => setOpen(open === l.lineId ? null : l.lineId)}
                    >
                      <td>
                        <ChevronRight
                          size={14}
                          className={`chevron-transition ${open === l.lineId ? 'rotated-90' : ''}`}
                        />
                      </td>
                      <td className="num">{l.time}</td>
                      <td>
                        <span className={`lvl lvl-${l.level}`}>{l.level}</span>
                      </td>
                      <td className="num">{l.eventId}</td>
                      <td>{l.source}</td>
                      <td>{l.content}</td>
                    </tr>
                    {open === l.lineId && (
                      <tr className="detail-row">
                        <td></td>
                        <td colSpan="5">
                          <div className="small font-sans">
                            Line #{l.lineId} · Template pattern: <code>{l.template}</code>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No log entries match" hint="Clear search or adjust filters." />
        )}
      </div>
    </>
  );
}
