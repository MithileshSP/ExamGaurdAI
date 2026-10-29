import { useState, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useApp } from '../context/AppContext.jsx';
import { minuteOf } from '../api.js';

// The same grouping analyze.py uses in the evidence pack: client IP removed, numbers -> N.
const masked = (message) => message.replace(/\[client [\d.]+\] /, '').replace(/\b\d+\b/g, 'N');

export default function LogsExplorer() {
  const { data } = useApp();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('All');
  const [open, setOpen] = useState(null);

  if (!data.logs) {
    return (
      <>
        <PageHeader title="Logs explorer" description="Apache error log lines for the session." />
        <div className="card">
          <EmptyState title="No Apache log for this session" hint="Its folder has no apache.csv." />
        </div>
      </>
    );
  }

  // ?incident=INC-2 shows the incident's minutes plus the 5 before it, like the evidence pack.
  const inc = data.incidents.find((i) => i.id === sp.get('incident'));
  const from = inc && data.series[Math.max(inc.first - 5, 0)].t;
  const rows = data.logs
    .map((l, i) => ({ ...l, lineId: i + 1 }))
    .filter(
      (l) =>
        (!inc || (from <= minuteOf(l.timestamp) && minuteOf(l.timestamp) <= inc.end)) &&
        (level === 'All' || l.level === level) &&
        l.message.toLowerCase().includes(q.toLowerCase())
    );

  const errs = rows.filter((l) => l.level === 'error');
  const count = {};
  errs.forEach((l) => (count[masked(l.message)] = (count[masked(l.message)] || 0) + 1));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  const levels = [...new Set(data.logs.map((l) => l.level))];

  return (
    <>
      <PageHeader
        title="Logs explorer"
        description="Apache error log lines for this session."
      />

      {inc && (
        <div className="scope-banner card">
          <span>
            Scoped to incident <strong>{inc.id}</strong> (lines from {from} to {inc.end}).
          </span>
          <button className="btn btn-xs" onClick={() => setSp({})}>
            Clear scope
          </button>
        </div>
      )}

      <div className="grid-4 mb-md">
        {[
          ['Lines shown', rows.length],
          ['Error lines', errs.length],
          ['Distinct error messages', Object.keys(count).length],
        ].map(([l, v]) => (
          <div key={l} className="card">
            <span className="label">{l}</span>
            <div className="stat num">{v}</div>
          </div>
        ))}
        <div className="card">
          <span className="label">Most frequent error</span>
          <p className="small font-mono mt-xs">{top ? `${top[1]}x ${top[0]}` : 'None'}</p>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={15} className="muted" />
          <input
            placeholder="Search messages"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="filter-select-label">
          <span>Level</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="select-input">
            {['All', ...levels].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
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
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
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
                      <td className="num">{l.timestamp.slice(11)}</td>
                      <td>
                        <span className={`lvl lvl-${l.level.toUpperCase()}`}>{l.level.toUpperCase()}</span>
                      </td>
                      <td>{l.message}</td>
                    </tr>
                    {open === l.lineId && (
                      <tr className="detail-row">
                        <td></td>
                        <td colSpan="3">
                          <div className="small font-sans">
                            Line {l.lineId}. The evidence pack groups it as <code>{masked(l.message)}</code>
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
          <EmptyState title="No log lines match" hint="Clear search or adjust filters." />
        )}
      </div>
    </>
  );
}
