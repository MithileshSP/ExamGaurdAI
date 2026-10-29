export const N = 180;
const END = 10 * 60 + 29;
export const incidentStartIdx = N - 1 - 19; // 10:10
export const fmtTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const rnd = (i, s) => Math.abs((Math.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1) - 0.5;
const make = (base, spike, noise, s, i) => {
  const k = i >= incidentStartIdx ? Math.min(1, (i - incidentStartIdx + 1) / 8) : 0;
  return Math.round((base + spike * k + noise * rnd(i, s)) * 10) / 10;
};
const defs = { response: [320, 1500, 60], cpu: [48, 24, 4], memory: [62, 19, 2], db: [95, 1150, 15], p95: [700, 3000, 100], p99: [1200, 5200, 200] };
export const series = Array.from({ length: N }, (_, i) => {
  const row = { t: fmtTime(END - (N - 1 - i)) };
  Object.entries(defs).forEach(([k, [b, s, n]], j) => (row[k] = make(b, s, n, j + 1, i)));
  return row;
});
export const incidentWindow = { from: series[incidentStartIdx].t, to: series[N - 1].t };
export const metricCards = [
  { key: 'students', label: 'Active students', value: '4,820', unit: '', change: '+312 vs previous 15 min', baseline: 'Baseline 4,500', status: 'normal', trend: 'Rising' },
  { key: 'response', label: 'Response time', value: '1,850', unit: 'ms', change: '+1,530 ms vs baseline', baseline: 'Baseline 320 ms', status: 'critical', trend: 'Increasing' },
  { key: 'cpu', label: 'CPU utilization', value: '72', unit: '%', change: '+24 pts vs baseline', baseline: 'Threshold 85%', status: 'warning', trend: 'Increasing' },
  { key: 'memory', label: 'Memory utilization', value: '81', unit: '%', change: '+19 pts vs baseline', baseline: 'Threshold 90%', status: 'warning', trend: 'Increasing' },
  { key: 'db', label: 'Database latency', value: '1,240', unit: 'ms', change: '+1,145 ms vs baseline', baseline: 'Baseline 95 ms', status: 'critical', trend: 'Increasing' },
  { key: 'errors', label: 'Error rate', value: '8.4', unit: '%', change: '412 failed of 4,905 requests', baseline: 'Baseline 0.6%', status: 'critical', trend: 'Increasing' },
];

/* Strictly classified chart colors: Primary Deep Nordic Teal, Alert Red for DB bottleneck, Neutral Slate for Compute */
export const chartDefs = [
  { key: 'response', title: 'Response time', unit: 'ms', color: '#0D766E' }, // Primary Deep Nordic Teal
  { key: 'db', title: 'Database latency', unit: 'ms', color: '#DC2626' },       // Alert / Bottleneck Red
  { key: 'cpu', title: 'CPU utilization', unit: '%', color: '#475569' },       // Neutral Slate
  { key: 'memory', title: 'Memory utilization', unit: '%', color: '#64748B' }, // Neutral Slate Light
];
