import { useNavigate } from 'react-router-dom';
import { SeverityBadge, StatusBadge } from '../common/Badge.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { fmt } from '../../api.js';

export default function IncidentTable({ rows, compact }) {
  const nav = useNavigate();

  if (!rows || !rows.length) {
    return <EmptyState title="No incidents" hint={compact ? undefined : 'Clear a filter to see more.'} />;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '110px' }}>Severity</th>
            <th>Incident</th>
            {!compact && <th style={{ width: '120px' }}>Status</th>}
            <th style={{ width: '130px' }}>Peak response</th>
            <th style={{ width: '110px' }}>Complaints</th>
            <th style={{ width: '100px' }}>Started</th>
            <th style={{ width: '100px' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr
              key={i.id}
              tabIndex={0}
              className="click"
              onClick={() => nav(`/incidents/${i.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && nav(`/incidents/${i.id}`)}
            >
              <td>
                <SeverityBadge level={i.severity} />
              </td>
              <td>
                <div className="incident-title-cell">
                  <strong>{i.title}</strong>
                  <span className="muted small font-mono">{i.id}</span>
                </div>
              </td>
              {!compact && (
                <td>
                  <StatusBadge status={i.status} />
                </td>
              )}
              <td className="num font-mono">{fmt(i.peak.response_time_ms)} ms</td>
              <td className="num font-mono">{i.complaints.length}</td>
              <td className="num font-mono">{i.start}</td>
              <td className="num font-mono">{i.minutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
