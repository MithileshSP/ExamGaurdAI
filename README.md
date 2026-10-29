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

While changing the frontend, run uvicorn as above and `cd frontend && npm run dev`,
then open http://127.0.0.1:5173: it reloads on every save and sends `/api` to uvicorn.

## Files

| File | What it does |
|---|---|
| `generate.py` | Reads the real Apache log for 2006-01-24 and makes that day's synthetic metrics and complaints, with a planted database slowdown |
| `split_dataset.py` | Splits `final_dataset.csv` into one folder per session; the `scenario` column goes only into `answer.txt` |
| `analyze.py` | Merges a session's files, finds slow minutes (pages over 1 s), builds the evidence pack, asks DeepSeek, writes `report.md` |
| `app.py` | FastAPI: `GET /api/sessions`, `/api/timeline`, `/api/logs`, `/api/complaints`, `/api/report`, `POST /api/analyze`, and the built React app for every other path |
| `frontend/src/api.js` | Every API call, and the incident objects the pages use (start, end, peak, before/during averages, complaints) |
| `frontend/src/context/AppContext.jsx` | The chosen session, its data, and the time range every chart shows |
| `frontend/src/pages/` | Dashboard, Incidents, Incident details, Root cause analysis (the DeepSeek report), Logs, Metrics, Complaints |
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
- **What next?** Access logs with per-request latency instead of synthetic
  response times, and live alerts while an exam is running.
