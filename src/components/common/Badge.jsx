import { severityMeta, statusLabel } from '../../utils/status.js';

export function SeverityBadge({ level }) {
  const meta = severityMeta[level] || severityMeta.medium;
  const { label } = meta;
  return (
    <span className={`badge sev-${level}`}>
      <span className="badge-dot" />
      <span>{label}</span>
    </span>
  );
}

export const StatusBadge = ({ status }) => {
  const label = statusLabel[status] || status;
  return (
    <span className={`badge st-${status}`}>
      <span className="badge-dot" />
      <span>{label}</span>
    </span>
  );
};

export const Chip = ({ children, tone = 'neutral' }) => (
  <span className={`chip chip-${tone}`}>{children}</span>
);
