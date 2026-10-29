// Badge labels. critical: slowest minute 3x the target or more; high: above the target.
export const severityMeta = { critical: { label: 'Critical' }, high: { label: 'High' }, normal: { label: 'Normal' } };
// open: still slow when the data ends. resolved: pages went back under the target.
export const statusLabel = { open: 'Ongoing', resolved: 'Recovered' };
