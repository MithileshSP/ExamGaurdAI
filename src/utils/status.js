import { OctagonAlert, TriangleAlert, CircleAlert, Info, CircleCheck } from 'lucide-react';
export const severityMeta = {
  critical: { label: 'Critical', Icon: OctagonAlert }, high: { label: 'High', Icon: TriangleAlert },
  medium: { label: 'Medium', Icon: CircleAlert }, low: { label: 'Low', Icon: Info },
  warning: { label: 'Warning', Icon: TriangleAlert }, normal: { label: 'Normal', Icon: CircleCheck },
};
export const statusLabel = { open: 'Open', investigating: 'Investigating', resolved: 'Resolved' };
