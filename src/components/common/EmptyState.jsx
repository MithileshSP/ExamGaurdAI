import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data available', hint, icon: Icon = Inbox }) {
  return (
    <div className="empty-box">
      <Icon size={24} className="muted" />
      <strong>{title}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}
