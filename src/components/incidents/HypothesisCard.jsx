import { useState } from 'react';
import { ChevronDown, Check, X, Circle } from 'lucide-react';
import { Chip } from '../common/Badge.jsx';

const strengthTone = { Strong: 'good', Moderate: 'warn', Weak: 'neutral' };

const EvidenceBlock = ({ title, items, Icon, cls }) => {
  if (!items || !items.length) return null;
  return (
    <div className="evidence-block">
      <h4>{title}</h4>
      <ul className="evidence-list">
        {items.map((t) => (
          <li key={t} className={`evidence-row ${cls}`}>
            <Icon size={14} className="evidence-icon" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function HypothesisCard({ h, open: defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article className={`card hyp ${h.rank === 1 ? 'hyp-lead' : ''}`}>
      <button
        type="button"
        className="hyp-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="rank-badge">{h.rank}</span>
        <div className="grow">
          <strong>{h.name}</strong>
          <span className="muted small block">{h.state}</span>
        </div>
        <Chip tone={strengthTone[h.strength] || 'neutral'}>
          {h.strength ?? 'Not evaluated'} evidence
        </Chip>
        <div className={`chevron-indicator ${open ? 'rotated' : ''}`}>
          <ChevronDown size={17} />
        </div>
      </button>

      {open && (
        <div className="hyp-body">
          <EvidenceBlock title="Supporting evidence" items={h.supporting} Icon={Check} cls="ev-good" />
          <EvidenceBlock title="Contradictory evidence" items={h.contradicting} Icon={X} cls="ev-bad" />
          <EvidenceBlock title="Missing measurements" items={h.missing} Icon={Circle} cls="ev-gap" />
          <div className="suggested-check-box">
            <h4>Suggested verification check</h4>
            <p className="small">{h.check}</p>
          </div>
        </div>
      )}
    </article>
  );
}
