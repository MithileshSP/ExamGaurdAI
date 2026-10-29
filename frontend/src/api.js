// Every call to the FastAPI backend (app.py), and the shapes the pages use.
// The numbers all come from the session's CSV files; nothing here is made up.

// One chart per metric, grouped by the data source it comes from.
export const METRICS = [
  { key: 'response_time_ms', title: 'Response time', unit: 'ms', source: 'Network' },
  { key: 'active_users', title: 'Active users', unit: '', source: 'Network' },
  { key: 'bandwidth_mbps', title: 'Bandwidth', unit: 'Mbps', source: 'Network' },
  { key: 'cpu_usage_pct', title: 'CPU', unit: '%', source: 'Server' },
  { key: 'memory_usage_pct', title: 'Memory', unit: '%', source: 'Server' },
  { key: 'db_query_time_ms', title: 'Database query time', unit: 'ms', source: 'Server' },
  { key: 'error_count', title: 'Errors', unit: '/min', source: 'Server' },
  { key: 'complaints', title: 'Student complaints', unit: '/min', source: 'Students' },
];

async function get(path, as = 'json') {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response[as]();
}

export const listSessions = () => get('/api/sessions');

// Ask DeepSeek again (1-2 minutes). The server sends one JSON line per piece as
// DeepSeek writes it: ["thinking", text] while it reasons, then ["report", text].
export async function streamAnalysis(name, onPiece) {
  const response = await fetch(`/api/analyze?session=${encodeURIComponent(name)}`, { method: 'POST' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop(); // the last line may still be incomplete
    for (const line of lines) if (line) onPiece(...JSON.parse(line));
  }
}

export const fmt = (n) => Math.round(n).toLocaleString('en-US');

// "12:50" from "2006-01-24 12:50:31", to compare with the chart minutes.
export const minuteOf = (timestamp) => timestamp.slice(11, 16);

// Average of every metric over some minutes, or null when there are none.
function averages(rows) {
  if (!rows.length) return null;
  return Object.fromEntries(METRICS.map(({ key }) =>
    [key, rows.reduce((sum, row) => sum + row[key], 0) / rows.length]));
}

// One incident = a run of slow minutes that analyze.find_incidents() found.
function toIncident([first, last], i, series, complaints, slowMs) {
  const during = series.slice(first, last + 1);
  const start = series[first].t, end = series[last].t;
  const peak = during.reduce((a, b) => (b.response_time_ms > a.response_time_ms ? b : a));
  const ongoing = last === series.length - 1; // still slow at the last minute shown
  return {
    id: `INC-${i + 1}`, first, last, start, end,
    title: `Slow pages ${start}–${end}`,
    minutes: during.length,
    severity: peak.response_time_ms >= 3 * slowMs ? 'critical' : 'high', // 3x the 1 s target
    status: ongoing ? 'open' : 'resolved',
    peak, // the slowest minute
    before: averages(series.slice(Math.max(first - 15, 0), first)), // the 15 min before
    during: averages(during),
    complaints: complaints.filter((c) => start <= minuteOf(c.timestamp) && minuteOf(c.timestamp) <= end),
  };
}

// Everything the API has for one session, fetched once.
export async function loadSession(name) {
  const q = `?session=${encodeURIComponent(name)}`;
  const [timeline, report, logs, complaints] = await Promise.all([
    get(`/api/timeline${q}`), get(`/api/report${q}`, 'text'),
    get(`/api/logs${q}`), get(`/api/complaints${q}`)]);
  return { name, timeline, report, logs, complaints };
}

// The session as if its data ended at minute `upto` (an index). With upto at the
// last minute this is the whole session; the replay moves upto forward minute by
// minute, so every page shows only what was known at that moment.
export function snapshot(raw, upto) {
  const t = raw.timeline;
  const now = t.minutes[upto];
  // The API sends one list per metric; charts want one object per minute.
  const series = t.minutes.slice(0, upto + 1).map((minute, i) =>
    Object.fromEntries([['t', minute], ...METRICS.map(({ key }) => [key, t[key][i]])]));
  const complaints = raw.complaints.filter((c) => minuteOf(c.timestamp) <= now);
  const isSlow = (i) => series[i].response_time_ms > t.slow_ms;
  const incidents = t.incidents
    .filter(([first]) => first <= upto) // started by now
    .map(([first, last]) => {
      last = Math.min(last, upto);
      while (!isSlow(last)) last--; // an incident ends on its last slow minute so far
      return [first, last];
    })
    .map((pair, i) => toIncident(pair, i, series, complaints, t.slow_ms));
  // A view picks the minutes every chart shows: all of them, or one incident with 30 min either side.
  const end = t.minutes.length - 1;
  const views = [{ label: 'Whole session', from: 0, to: end },
    ...incidents.map((inc) => ({ label: inc.id, from: Math.max(inc.first - 30, 0), to: Math.min(inc.last + 30, end) }))];
  return {
    name: raw.name, slowMs: t.slow_ms, upto, end,
    minutes: t.minutes, // every minute of the session, for the chart axes
    series, incidents, views, complaints,
    logs: raw.logs && raw.logs.filter((l) => minuteOf(l.timestamp) <= now),
  };
}
