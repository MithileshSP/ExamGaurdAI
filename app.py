"""Web server for the exam-portal analysis: the API, and the React app in frontend/.

Run from the repo root:
  (cd frontend && npm run build)    # once, and after every frontend change
  set -a; . ./.env; set +a; .venv/bin/uvicorn app:app
then open http://127.0.0.1:8000. The old one-page version is at /static/index.html.
"""
import json
import os
from collections import Counter

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

import analyze
import db

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


# Keep this last. Any other path (/, /incidents/INC-1, ...) is a page of the
# React app: the browser gets index.html and React draws the page for the URL.
@app.get("/{path:path}")
def page(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, f"no API route /{path}")
    return FileResponse("frontend/dist/index.html")
