"""Web server for the exam-portal analysis: the API, and the React app in frontend/.

Run from the repo root:
  (cd frontend && npm run build)    # once, and after every frontend change
  set -a; . ./.env; set +a; .venv/bin/uvicorn app:app
then open http://127.0.0.1:8000. The old one-page version is at /static/index.html.
"""
import csv
import io
import json
import os
import re
import threading
import time
from collections import Counter, defaultdict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

import analyze
import db
import live
import split_dataset

app = FastAPI(title="Exam portal root-cause analysis")


@app.on_event("startup")
def startup_db():
    """Seed data into MySQL on startup if MySQL is available and empty."""
    if db.is_db_available():
        db.seed_from_csv()


@app.get("/api/db-status")
def db_status():
    """Health check for MySQL connection."""
    available = db.is_db_available()
    return {"database": "mysql", "connected": available, "mode": "mysql" if available else "file_fallback"}

app.mount("/static", StaticFiles(directory="static"), name="static")
# The built React app: index.html plus its JavaScript and CSS in assets/.
app.mount("/assets", StaticFiles(directory="frontend/dist/assets", check_dir=False),
          name="assets")


def folder(session):
    """The session's folder. Only names that exist are accepted, so a request
    cannot reach files outside data/sessions/."""
    if session not in analyze.sessions():
        raise HTTPException(404, f"no session {session!r}")
    return os.path.join(analyze.SESSIONS, session)


@app.get("/api/sessions")
def sessions():
    """Every session with its answer key, which the page keeps hidden until asked."""
    result = []
    for name in analyze.sessions():
        with open(os.path.join(folder(name), "answer.txt"), encoding="utf-8") as f:
            result.append({"name": name, "answer": f.read().strip()})
    return result


@app.get("/api/timeline")
def timeline(session: str):
    """Everything the charts need: one value per minute for each metric."""
    folder(session)
    rows, apache, complaints = analyze.load(session)
    per_minute = Counter(r["timestamp"][:16] for r in complaints)
    data = {"minutes": [row["timestamp"][11:16] for row in rows],
            "slow_ms": analyze.SLOW_MS,
            "incidents": analyze.find_incidents(rows),
            "has_apache_log": apache is not None,
            "complaints": [per_minute[row["timestamp"][:16]] for row in rows]}
    for key in analyze.METRICS:
        data[key] = [float(row[key]) for row in rows]
    return data


@app.get("/api/logs")
def logs(session: str):
    """The session's Apache log lines (timestamp, level, message), or null."""
    folder(session)
    return analyze.load(session)[1]


@app.get("/api/complaints")
def complaints(session: str):
    """The session's student complaints (timestamp, complaint_text)."""
    folder(session)
    return analyze.load(session)[2]


@app.get("/api/report", response_class=PlainTextResponse)
def report(session: str):
    """The last saved report, so the page shows something instantly."""
    path = os.path.join(folder(session), "report.md")
    if not os.path.exists(path):
        return "No report yet. Press Run analysis."
    with open(path, encoding="utf-8") as f:
        return f.read()


@app.post("/api/analyze")
def run_analysis(session: str):
    """Ask DeepSeek again and stream its pieces as it writes them, one JSON line
    each: ["thinking", "..."] while it reasons, then ["report", "..."].
    analyze() saves report.md at the end. Starlette runs the generator in a
    worker thread, so the 1-2 minute call does not freeze the server."""
    folder(session)
    lines = (json.dumps(piece) + "\n" for piece in analyze.analyze(session))
    return StreamingResponse(lines, media_type="application/x-ndjson")


@app.post("/api/upload")
async def upload(request: Request, name: str):
    """A CSV with final_dataset.csv's columns becomes a new session, or one per
    scenario if it has a scenario column, like final_dataset.csv itself. The file
    is the request body, so no form library is needed. Returns the new session names."""
    body = await request.body()
    if len(body) > 20_000_000:
        raise HTTPException(413, "The file is over 20 MB.")
    try:
        rows = list(csv.DictReader(io.StringIO(body.decode("utf-8-sig"))))
    except (UnicodeDecodeError, csv.Error) as e:
        raise HTTPException(400, f"Not a readable CSV file: {e}")
    if not rows:
        raise HTTPException(400, "The file has no rows.")
    missing = [c for c in split_dataset.COLUMNS if c not in rows[0]]
    if missing:
        raise HTTPException(400, f"Missing columns: {', '.join(missing)}.")

    # Check every row now, so a bad file is refused instead of breaking the charts later.
    for line, row in enumerate(rows, start=2):  # line 1 is the header
        if not re.match(r"\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}", row["timestamp"] or ""):
            raise HTTPException(400, f"Line {line}: timestamp {row['timestamp']!r} is not like 2026-10-29 09:30:00.")
        row["timestamp"] = row["timestamp"].replace("T", " ")
        for column in split_dataset.COLUMNS[1:-1]:  # every column but timestamp and complaint_text
            try:
                float(row[column])
            except (TypeError, ValueError):
                raise HTTPException(400, f"Line {line}: {column} {row[column]!r} is not a number.")
        row["complaint_text"] = row["complaint_text"] or ""

    # Uploaded sessions start with upload_, so they never replace the built-in ones.
    # The name is cut down to letters, digits, _ and -, so it cannot leave data/sessions/.
    def clean(text):
        return re.sub(r"[^A-Za-z0-9_-]+", "_", text).strip("_")[:40]
    base = "upload_" + (clean(name) or "data")
    by_scenario = defaultdict(list)
    for row in rows:
        by_scenario[row.get("scenario") or ""].append(row)
    created = []
    for scenario, group in by_scenario.items():
        session = base if len(by_scenario) == 1 else f"{base}_{clean(scenario)}"
        path = os.path.join(analyze.SESSIONS, session)
        split_dataset.write_session(path, group, scenario or "No answer key: the file had no scenario column.")
        # A report from an earlier upload under this name describes other data.
        if os.path.exists(f"{path}/report.md"):
            os.remove(f"{path}/report.md")
        created.append(session)
    return created


# The live stream (live.py). One stream at a time, shared by everyone watching.
@app.get("/api/live/stream")
def live_stream():
    """Server-sent events: the live state as JSON each time it changes, at most 4
    times a second. The browser's EventSource reconnects by itself if this drops.
    A comment line every 15 s keeps proxies from closing a quiet connection."""
    def events():
        seen = None  # nothing sent yet, so the first wait returns at once
        while True:
            seen, data = live.wait(seen, 15)
            yield f"data: {data}\n\n" if data else ": keep-alive\n\n"
            time.sleep(0.25)
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.post("/api/live/start")
def live_start(session: str, speed: float = 10, start: str = ""):
    """Play a stored session into the live analysis, `speed` minutes a second,
    from `start` (HH:MM). It replaces whatever stream was there."""
    folder(session)
    if not 0 < speed <= 600:
        raise HTTPException(400, "speed must be over 0 and at most 600 minutes a second.")
    if start and not re.fullmatch(r"\d{2}:\d{2}", start):
        raise HTTPException(400, f"start {start!r} is not like 09:30.")
    threading.Thread(target=live.feed, args=(session, speed, start), daemon=True).start()
    return {"ok": True}


@app.post("/api/live/stop")
def live_stop():
    live.stop()
    return {"ok": True}


@app.post("/api/live/ingest")
async def live_ingest(request: Request, new: bool = False):
    """Records from a log shipper or script, one JSON object per line (see live.py).
    new=true starts a new stream first. Records join the stream in order; the first
    one that cannot be read stops the request with its line number."""
    if live.state["feeding"] and not new:
        raise HTTPException(409, "A stored session is playing. Stop it first, or send new=true.")
    body = (await request.body()).decode("utf-8", "replace")
    if new:
        live.reset("records sent to /api/live/ingest")
    for n, line in enumerate(body.splitlines(), start=1):
        if line.strip():
            try:
                live.ingest(json.loads(line))
            except ValueError as e:  # bad JSON is a ValueError too
                raise HTTPException(400, f"Record {n}: {e}")
    return {"received": live.state["received"]}


@app.post("/api/live/save")
def live_save():
    """Save what has arrived as the live_recording session, to replay on the dashboard."""
    try:
        return {"session": live.save()}
    except ValueError as e:
        raise HTTPException(400, str(e))


# Keep this last. Any other path (/, /incidents/INC-1, ...) is a page of the
# React app: the browser gets index.html and React draws the page for the URL.
@app.get("/{path:path}")
def page(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, f"no API route /{path}")
    return FileResponse("frontend/dist/index.html")
