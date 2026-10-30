# Exam portal slowdown: root-cause analysis

This is a mock run of PS 1.4 (see `PROBLEM.md`). For each exam session it puts
the server, network and complaint data on one timeline, finds when the portal
was slow, and asks DeepSeek why, then writes an incident report. The web UI in
`frontend/` started as ExamGuard AI (a React design with sample data); every
number it shows now comes from this backend.

There are five sessions:
- `loghub_2006-01-24` is built from the real Loghub Apache log.
- `dataset_A` to `dataset_D` come from `data/given/final_dataset.csv`.

## Problem statement checklist

| The sheet asks for | Where it is |
|---|---|
| Correlate server, network and user complaint data on one timeline | Each session keeps `server.csv`, `network.csv` and `complaints.csv` apart; `analyze.load()` merges them minute by minute, and the page shows them as one chart per metric, grouped by source, on the same minutes |
| Identify the root cause of the slowdown | `analyze.py` finds slow minutes and builds the evidence; DeepSeek names the cause and what it rules out |
| Incident report with resolution and prevention steps | `data/sessions/<session>/report.md`, shown on the page, with the evidence appended |
| Data source: Loghub Apache logs | `generate.py` reads the full Loghub Apache log; its lines are evidence in the `loghub_2006-01-24` session |
| Synthetic fields: timestamp, active_users, response_time_ms, cpu_usage_pct, memory_usage_pct, db_query_time_ms, bandwidth_mbps, error_count, complaint_text | All nine are in every session, from `generate.py` or from `final_dataset.csv` |

## Run

```bash
uv venv .venv && uv pip install --python .venv -r requirements.txt   # once
(cd frontend && npm ci && npm run build)   # once, and after every frontend change
python3 generate.py          # real Apache log -> data/sessions/loghub_2006-01-24/
python3 split_dataset.py     # final_dataset.csv -> data/sessions/dataset_A..D/
set -a; . ./.env; set +a     # loads DEEPSEEK_API_KEY
python3 analyze.py           # one report.md per session (1-2 minutes each)
.venv/bin/uvicorn app:app    # then open http://127.0.0.1:8000
```

`python3 analyze.py dataset_C` analyzes one session. The old one-page UI is still at
`/static/index.html` (`/static/index.html?session=dataset_C` opens one session).

**Upload CSV** (top bar) turns any CSV with `final_dataset.csv`'s columns into a new
session named `upload_<file name>`, one per scenario if it has a `scenario` column.
The server checks every row first and says which column or line is wrong. Uploaded
sessions are not committed (`.gitignore`); delete their folder in `data/sessions/` to remove one.
Keys 1 to 7 open the seven pages.

**Live** (key 7) analyzes an incoming stream as it arrives. Pick a session, a start
time and a speed, and press Play live: the server plays it as if it were happening
now. Every log line is shown with a risk (high, medium, low) and the reason, and
each finding is an alert. Red, yellow and green alerts also pop up on every page,
and Desktop alerts sends red ones to the system tray too. The stream keeps going
while you use the other pages. **Open recording on dashboard** saves what arrived
as the `live_recording` session, to replay it or ask DeepSeek about it.

Anything that can POST can feed the stream instead, one JSON object per line, in
time order (`new=true` starts a new stream):

```bash
curl -X POST 'http://127.0.0.1:8000/api/live/ingest?new=true' --data-binary @- <<'EOF'
{"kind": "log", "timestamp": "2026-10-31 09:30:05", "level": "error", "message": "mod_jk child workerEnv in error state 8"}
{"kind": "complaint", "timestamp": "2026-10-31 09:30:20", "complaint_text": "The page froze"}
{"kind": "metric", "timestamp": "2026-10-31 09:30:00", "active_users": 900, "response_time_ms": 1500, "cpu_usage_pct": 40, "memory_usage_pct": 50, "db_query_time_ms": 80, "bandwidth_mbps": 100, "error_count": 3}
EOF
```

While changing the frontend, run uvicorn as above and `cd frontend && npm run dev`,
then open http://127.0.0.1:5173: it reloads on every save and sends `/api` to uvicorn.

## Files

| File | What it does |
|---|---|
| `generate.py` | Reads the real Apache log for 2006-01-24 and makes that day's synthetic metrics and complaints, with a planted database slowdown |
| `split_dataset.py` | Splits `final_dataset.csv` into one folder per session; the `scenario` column goes only into `answer.txt`. Its `write_session()` also writes uploaded sessions |
| `analyze.py` | Merges a session's files, finds slow minutes (pages over 1 s), builds the evidence pack, asks DeepSeek, writes `report.md` |
| `live.py` | The live stream: takes records one at a time, flags each log line's risk, and runs the detectors each minute (incidents, suspects, error bursts, new messages, complaints) |
| `app.py` | FastAPI: `GET /api/sessions`, `/api/timeline`, `/api/logs`, `/api/complaints`, `/api/report`, `POST /api/analyze`, `POST /api/upload`, the live routes (`GET /api/live/stream`, `POST /api/live/start`, `/stop`, `/ingest`, `/save`), and the built React app for every other path |
| `frontend/src/api.js` | Every API call, and the incident objects the pages use (start, end, peak, before/during averages, complaints) |
| `frontend/src/context/AppContext.jsx` | The chosen session, its data, and the time range every chart shows |
| `frontend/src/context/LiveContext.jsx` | Follows the live stream for the whole app and turns new alerts into pop-ups and desktop notifications |
| `frontend/src/pages/` | Dashboard, Incidents, Incident details, Root cause analysis (the DeepSeek report), Logs, Metrics, Complaints, Live |
| `static/index.html` | The old one-page UI, kept as a fallback |

## Defend

- **Does DeepSeek see the answer?** No. The dataset's `scenario` column is
  written only to `answer.txt`, and `analyze.py` never opens that file. The
  page hides the answer key until you click it.
- **How is an incident detected?** A minute is slow when pages take over 1 s.
  Slow minutes with at most 2 normal minutes between them form one incident. It is plain code you
  can check by hand.
- **Why not "3x the median"?** We started with that. It fails when the portal
  is slow for most of a session, as in sessions A to D, where it is slow for 2
  of 3 hours, so the median *is* the slow speed. A fixed 1 s target does not
  have that problem.
- **Why an LLM rather than rules?** Rules find *when*. Saying *why* means
  comparing every metric before and during, reading log text (a harmless 404
  scan versus a connector crash) and writing the fix and prevention steps. The
  LLM sees only a one-page evidence pack, and that pack is appended to the
  report, so every claim in it can be checked.
- **Why is the data synthetic?** The sheet asks for it: the Apache log has no
  response times, users or complaints. In the Loghub session the 20:49 worker
  crashes are real, and the 12:50 database slowdown is planted. The real bot
  scan at 12:51 is a decoy.
- **Why do sessions A to D have no Apache log?** The dataset has none, and we
  did not invent log lines to match it. The Loghub session shows the log being
  used as evidence.
- **What if the API is down?** The page shows the last saved report straight
  away. Run analysis is optional.
- **Why is the report's HTML shown as text?** Log lines are attacker-controlled
  (bots choose the URLs they request), and the report quotes them. So the page
  shows any HTML in the report as plain text, and only `http(s)` links stay
  clickable (`frontend/src/pages/RootCauseAnalysis.jsx`).
- **Where do the numbers on the React pages come from?** `frontend/src/api.js`
  fetches them from the API and computes only plain things: averages, peaks,
  and which complaints fall inside an incident's minutes. Severity is
  "critical" when the slowest minute is over 3 s (3x the target), otherwise
  "high". The cause is only ever DeepSeek's report; the UI never guesses one.
- **How does the dashboard rank suspects?** By how much each possible cause
  changed from the 15 minutes before an incident to during it. Response time,
  errors and complaints are left out: they are what users get whatever the
  cause. We tried ranking by correlation first, but in a traffic surge users,
  bandwidth, CPU, memory and the database all correlate 0.94 to 0.98 with
  response time, so it cannot tell them apart. Ranked by change, the top suspect
  matches the answer key or DeepSeek in all six incidents. When nothing moved by
  10% (the real Apache crash at 20:49), the panel says the cause is outside the
  metrics and points to the log. It is a lead, not proof; DeepSeek's report is the
  verdict (`frontend/src/components/dashboard/Suspects.jsx`).
- **Where does the verdict panel come from?** The saved `report.md`: the first
  sentence under "### Incident N", and the bullets that say a cause is ruled out
  or not supported. It is read from free text, so anything not found is left out
  (`frontend/src/components/dashboard/Verdict.jsx`).
- **What does Upload CSV accept?** The columns of `final_dataset.csv`. Every row
  is checked (timestamp format, numbers) before anything is written, the file
  name is cut down to letters, digits, `_` and `-` so it cannot leave
  `data/sessions/`, and uploads are always named `upload_...` so they never
  replace a built-in session (`app.py`, `upload()`).
- **How does Live decide a log line's risk?** Fixed rules in `live.py` (`RISKS`),
  checked by hand against every message type in the real Apache log. High: the
  server itself is failing (a mod_jk worker in an error state, Apache losing a
  worker, a worker failing to start), so students' requests can fail. Medium: a
  404/403 from a client that sent 10 or more error lines this minute (a scan), or
  an error message no rule knows. Low: a single 404, or Apache's routine worker
  recycling. A high-risk line raises an alert the moment it arrives, once per
  message per minute, so a burst of 40 identical lines is one alert, not 40.
- **Scan or server fault?** A burst is at least 10 error lines in a minute and 5
  times the usual. If one client sent 80% or more of them, it is a scan (yellow);
  otherwise the server is failing (red). On the Loghub day this calls every bot
  scan a scan, including the 12:52 decoy, and the 20:49 crash a server fault.
- **Is Live the same analysis as the dashboard?** The same rules, applied a minute
  at a time: an incident opens on the first minute over 1 s and closes after 3
  normal minutes, and suspects are ranked as on the dashboard. Played live, all
  five sessions give the same incidents as the batch analysis, and the top suspect
  matches the answer key in each (database, CPU, memory, bandwidth, and database
  for Loghub's INC-1, named in the alert the minute it opens).
- **Why server-sent events, not WebSockets?** The browser only listens, and SSE
  is plain HTTP: no extra library on either side, and `EventSource` reconnects by
  itself. Each update is the whole state (the last 90 minutes), so a browser that
  missed some never gets out of step.
- **What next?** Access logs with per-request latency instead of synthetic
  response times, and a log shipper (Fluent Bit, Vector) posting to `/api/live/ingest`.
