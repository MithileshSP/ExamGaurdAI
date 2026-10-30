"""Real-time analysis of an incoming stream of exam-portal data.

Records arrive one at a time: from any log shipper through POST /api/live/ingest,
or from feed(), which plays a stored session back as if it were happening now.
A record is one JSON object, in time order:
  {"kind": "log", "timestamp": "2006-01-24 20:49:02", "level": "error", "message": "..."}
  {"kind": "complaint", "timestamp": "...", "complaint_text": "..."}
  {"kind": "metric", "timestamp": "...", "active_users": 1016, ...}   one per minute,
      with every metric in analyze.METRICS

Each log line is given a risk (high, medium, low) and a reason the moment it
arrives, and a high-risk line raises an alert at once. The rest of the analysis
runs a minute at a time. A minute closes when its metric row arrives, or when a
record from a later minute does (so a stream of log lines alone works too):
  incidents      the rule of analyze.find_incidents(), applied as minutes arrive
  suspects       while an incident is open, the metrics ranked by how much they changed
  error bursts   far more Apache error lines than usual, and whether one client
                 caused them (a scan) or the server did (a fault)
  new messages   error messages the stream has not shown before
  complaints     the first student complaint during an incident
Every finding becomes an alert in state["events"]. app.py sends the state to the
browser each time it changes (GET /api/live/stream); the browser turns alerts
into notifications.
"""
import json
import os
import re
import threading
import time
from collections import Counter, defaultdict
from statistics import mean

import analyze
import split_dataset

# Response time, errors and complaints are symptoms, so they are never suspects
# (the same rule as the dashboard's Suspects panel).
SUSPECTS = {"active_users": "Active users", "bandwidth_mbps": "Bandwidth", "cpu_usage_pct": "CPU",
            "memory_usage_pct": "Memory", "db_query_time_ms": "Database query time"}
# The risk of one log line: the first pattern that matches its message decides.
# High means the server itself is failing, so students' requests can fail.
RISKS = [
    ("high", r"in error state", "A mod_jk worker is in an error state: requests to the exam app can fail."),
    ("high", r"Can't find child", "Apache lost track of a worker process: requests on it can be dropped."),
    ("high", r"child init \d+ -\d+", "A mod_jk worker failed to start (negative init code)."),
    ("low", r"File does not exist|script not found|Directory index forbidden",
     "A client asked for a page that is not there (404/403)."),
    ("low", r"Found child|init\(\) ok|Shutting down", "Routine: Apache starting or recycling a worker."),
]
SCAN_LINES = 10  # a client with this many error lines in one minute is scanning: its lines become medium
BURST = 10       # an error burst is at least this many Apache error lines in a minute
BURST_X = 5      # and this many times the average of the 15 minutes before
SCAN = 0.8       # when one client sent this share of a burst, it is a scan, not a server fault
RECORDING = "live_recording"  # the session folder save() writes

changed = threading.Condition()  # guards state; notify_all() wakes the browsers following it
state = {}


def reset(source, answer="No answer key: the stream came from outside."):
    """Forget the old stream and start a new one."""
    with changed:
        run = state.get("run", 0) + 1          # a feed() of the old stream stops when it sees this
        version = state.get("version", 0) + 1  # never goes back, so followers always see the change
        state.clear()
        state.update(source=source, answer=answer, run=run, version=version, stream=version,
                     feeding=False, received=0, minutes=[], open_minute=None, pending=[],
                     logs=[], high=[], risks=Counter(), flagged=set(), complaints=[],
                     incidents=[], events=[], known=set())
        changed.notify_all()


reset("nothing yet")


def mask(message):
    """Group log messages as analyze.py's evidence pack does: client IP removed, numbers -> N."""
    return re.sub(r"\b\d+\b", "N", re.sub(r"\[client [\d.]+\] ", "", message))


def client(message):
    found = re.search(r"\[client ([\d.]+)\]", message)
    return found and found[1]


def assess(line):
    """The risk of one log line and why. Call with the lock held: it looks at the
    minute so far to see whether the line's client is scanning."""
    risk, reason = ("medium", "An error message with no known meaning: worth a look.") \
        if line["level"] == "error" else ("low", "Routine notice.")
    for level, pattern, why in RISKS:
        if re.search(pattern, line["message"]):
            risk, reason = level, why
            break
    ip = client(line["message"])
    if risk == "low" and ip and line["level"] == "error":
        sent = sum(1 for r in state["pending"] if r["kind"] == "log" and client(r["message"]) == ip) + 1
        if sent >= SCAN_LINES:
            risk, reason = "medium", f"Part of a scan: {sent} error lines from {ip} this minute."
    return risk, reason


def alert(level, title, detail, t=None):
    """level: alarm, warn, ok or info. Call with the lock held."""
    if t is None:
        t = state["minutes"][-1]["t"] if state["minutes"] else ""
    state["events"].append({"id": len(state["events"]) + 1, "t": t, "level": level,
                            "title": title, "detail": detail})


def note(level, title, detail):
    """An alert from outside the detectors (stream started, ended, stopped)."""
    with changed:
        alert(level, title, detail)
        state["version"] += 1
        changed.notify_all()


def ingest(record, quiet=False, run=None):
    """Take one record and analyze it. quiet: analyze, but raise no alerts (feed()
    uses it to catch up on the minutes before its start time). run: the stream
    feed() was started for; its records are dropped once another stream replaces it.
    Raises ValueError for a record it cannot read, or one out of time order."""
    if not isinstance(record, dict):
        raise ValueError("a record is one JSON object, like {\"kind\": \"log\", ...}")
    kind, timestamp = record.get("kind"), str(record.get("timestamp", ""))
    if not re.match(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}", timestamp):
        raise ValueError(f"timestamp {timestamp!r} is not like 2026-10-29 09:30:00")
    try:
        if kind == "metric":
            record = {"timestamp": timestamp, **{key: float(record[key]) for key in analyze.METRICS}}
        elif kind == "log":
            record = {"timestamp": timestamp, "level": str(record["level"]), "message": str(record["message"])}
        elif kind == "complaint":
            record = {"timestamp": timestamp, "complaint_text": str(record["complaint_text"])}
        else:
            raise ValueError(f"kind must be metric, log or complaint, not {kind!r}")
    except (KeyError, TypeError) as e:
        raise ValueError(f"a {kind} record needs {e}")

    with changed:
        if run is not None and run != state["run"]:
            return
        minute = timestamp[:16]
        closed = state["minutes"][-1]["timestamp"][:16] if state["minutes"] else ""
        if minute < (state["open_minute"] or "") or minute <= closed:
            raise ValueError(f"it is from {minute}, but {state['open_minute'] or closed} has arrived: "
                             "records must come in time order")
        if state["open_minute"] and minute > state["open_minute"]:
            close_minute(None, quiet)  # a record from a later minute closes the open one
        state["open_minute"] = minute
        if kind == "metric":
            close_minute(record, quiet)  # a metric row closes its own minute
        elif kind == "log":
            on_log(record, quiet)
        else:
            state["pending"].append({"kind": kind, **record})
            state["complaints"].append(record)
        state["received"] += 1
        state["version"] += 1
        changed.notify_all()


def on_log(line, quiet):
    """Flag the line's risk as it arrives. A high-risk line raises an alert at
    once, the first time its message shows up in a minute."""
    line["risk"], line["reason"] = assess(line)
    state["pending"].append({"kind": "log", **line})
    state["logs"].append(line)
    state["risks"][line["risk"]] += 1
    if line["risk"] == "high":
        state["high"].append(line)
        key = (line["timestamp"][:16], mask(line["message"]))
        if not quiet and key not in state["flagged"]:
            state["flagged"].add(key)
            alert("alarm", "High-risk log line", f"{line['reason']} \"{line['message']}\"", line["timestamp"][11:16])


def close_minute(metric, quiet):
    """Run the detectors on the minute that just ended. Call with the lock held."""
    pending, minute = state["pending"], state["open_minute"]
    state["pending"], state["open_minute"] = [], None
    errors = [r for r in pending if r["kind"] == "log" and r["level"] == "error"]
    said = [r for r in pending if r["kind"] == "complaint"]
    minutes = state["minutes"]
    minutes.append({**(metric or {"timestamp": minute + ":00"}), "t": minute[11:16],
                    "log_lines": sum(r["kind"] == "log" for r in pending),
                    "log_errors": len(errors), "complaints": len(said)})
    i = len(minutes) - 1

    found = check_incidents(minutes, i) if metric else []
    found += check_errors(minutes, i, errors)
    new = [m for m in dict.fromkeys(mask(r["message"]) for r in errors) if m not in state["known"]]
    state["known"].update(new)
    if new:
        more = f"; and {len(new) - 3} more" if len(new) > 3 else ""
        found.append(("info", f"{len(new)} new error message{'s' if len(new) > 1 else ''}",
                      "; ".join(new[:3]) + more))
    incident = open_incident()
    if incident and said and not incident["complained"]:
        incident["complained"] = True
        found.append(("info", f"Students noticed {incident['id']}",
                      f"First complaint: \"{said[0]['complaint_text']}\""))
    if not quiet:
        for level, title, detail in found:
            alert(level, title, detail)


def open_incident():
    incidents = state["incidents"]
    return incidents[-1] if incidents and incidents[-1]["open"] else None


def check_incidents(minutes, i):
    """Open and close incidents with analyze.find_incidents()'s rule, one minute
    at a time: slow minutes with at most GAP normal minutes between are one incident."""
    row, incident, found, opened = minutes[i], open_incident(), [], False
    if row["response_time_ms"] > analyze.SLOW_MS:
        if not incident:
            incident = {"id": f"INC-{len(state['incidents']) + 1}", "first": i, "open": True, "complained": False}
            state["incidents"].append(incident)
            opened = True
        incident["last"] = i
    elif incident and i - incident["last"] > analyze.GAP:
        incident["open"] = False
        found.append(("ok", f"{incident['id']} recovered",
                      f"Pages under the target again from {minutes[incident['last'] + 1]['t']}; "
                      f"it lasted {incident['last'] - incident['first'] + 1} min."))
    if incident and incident["open"]:
        incident["suspects"] = suspects(minutes, incident["first"], i)
    if opened:
        top = incident["suspects"][0]
        lead = f" Top suspect so far: {SUSPECTS[top['key']]}, {top['change']}." \
            if top["pct"] is None or top["pct"] >= 10 else ""
        found.append(("alarm", f"{incident['id']} opened",
                      f"Pages took {row['response_time_ms']:,.0f} ms at {row['t']}, "
                      f"over the {analyze.SLOW_MS / 1000:g} s target.{lead}"))
    return found


def suspects(minutes, first, last):
    """The possible causes, ranked by how much each changed from the 15 minutes
    before the incident to during it (as on the dashboard's Suspects panel)."""
    before = [m for m in minutes[max(first - 15, 0):first] if "response_time_ms" in m]
    during = [m for m in minutes[first:last + 1] if "response_time_ms" in m]
    ranked = []
    for key in SUSPECTS:
        b = mean(m[key] for m in before) if before else None
        d = mean(m[key] for m in during)
        if b is None:
            order, label = float("-inf"), "-"
        elif b == 0:
            order, label = (float("inf"), "new") if d > 0 else (0.0, "0%")
        else:
            order = (d - b) / b * 100
            label = f"{order:+,.0f}%"
        ranked.append((order, {"key": key, "before": b, "during": d, "change": label,
                               "pct": order if abs(order) != float("inf") else None}))  # JSON has no infinity
    return [s for _, s in sorted(ranked, key=lambda pair: -pair[0])]


def check_errors(minutes, i, errors):
    """An error burst: far more Apache error lines than usual. When one client sent
    nearly all of them it is a scan or a broken client; otherwise the server is failing."""
    usual = mean(m["log_errors"] for m in minutes[max(i - 15, 0):i]) if i else 0
    if len(errors) < BURST or len(errors) < BURST_X * usual:
        return []
    message, times = Counter(mask(r["message"]) for r in errors).most_common(1)[0]
    clients = Counter(filter(None, (client(r["message"]) for r in errors)))
    ip, sent = clients.most_common(1)[0] if clients else (None, 0)
    t = minutes[i]["t"]
    if sent >= SCAN * len(errors):
        return [("warn", f"Error burst from one client, {ip}",
                 f"{sent} of {len(errors)} error lines at {t} came from it, mostly \"{message}\". "
                 "One client causing nearly all of them looks like a scan, not a server fault.")]
    return [("alarm", "Server error burst",
             f"{len(errors)} error lines at {t}, against {usual:.1f} a minute before. "
             f"Most common: {times}x \"{message}\".")]


def feed(session, speed, start=""):
    """Play a stored session into ingest() as if it were arriving now, `speed`
    minutes a second: each minute's log lines and complaints, then its metric row.
    Minutes before `start` (HH:MM) go in at once and quietly, so the detectors
    know what normal looked like before the alerts start."""
    with open(os.path.join(analyze.SESSIONS, session, "answer.txt")) as f:
        reset(f"{session} at {speed:g} min/s", f.read().strip())
    with changed:
        run = state["run"]
        state["feeding"] = True
    rows, apache, complaints = analyze.load(session)
    extras = defaultdict(list)  # minute -> its log lines and complaints
    for line in apache or []:
        extras[line["timestamp"][:16]].append({"kind": "log", **line})
    for c in complaints:
        extras[c["timestamp"][:16]].append({"kind": "complaint", **c})
    note("info", "Stream started", f"Playing {session} at {speed:g} minutes a second"
         + (f", from {start}." if start else "."))

    caught_up = not start
    for row in rows:
        minute = row["timestamp"][:16]
        quiet = minute[11:] < start
        if not quiet and not caught_up:
            caught_up = True
            note("info", f"Caught up to {start}",
                 f"{len(state['minutes'])} minutes and {len(state['logs'])} log lines went in quietly, "
                 f"with {len(state['incidents'])} incident(s), so the detectors know what normal looks like.")
        batch = sorted(extras[minute], key=lambda r: r["timestamp"]) + [{"kind": "metric", **row}]
        for record in batch:
            if state["run"] != run:
                return  # stopped, or another stream replaced this one
            ingest(record, quiet, run)
            if not quiet:
                time.sleep(1 / speed / len(batch))  # spread the minute's records over its share of a second
    if state["run"] == run:
        with changed:
            state["feeding"] = False
        note("info", "Stream ended", f"All of {session} has arrived. Open the recording to replay it or ask DeepSeek.")


def stop():
    with changed:
        state["run"] += 1  # feed() stops at its next record
        was_feeding, state["feeding"] = state["feeding"], False
    if was_feeding:
        note("info", "Stream stopped", "No more records are played. What arrived is kept.")


def wait(seen, timeout):
    """Wait until the state changes from version `seen`, up to `timeout` seconds.
    Returns the new version and the state as JSON, or `seen` and None on timeout."""
    with changed:
        changed.wait_for(lambda: state["version"] != seen, timeout)
        if state["version"] == seen:
            return seen, None
        minutes = state["minutes"]
        first = max(len(minutes) - 90, 0)  # the page shows the last 90 minutes
        incidents = [{**inc, "start": minutes[inc["first"]]["t"], "end": minutes[inc["last"]]["t"],
                      "minutes": inc["last"] - inc["first"] + 1} for inc in state["incidents"]]
        return state["version"], json.dumps({
            "stream": state["stream"], "source": state["source"], "feeding": state["feeding"],
            "received": state["received"], "risks": state["risks"], "known_errors": len(state["known"]),
            "minutes": minutes[first:], "first": first, "incidents": incidents,
            "events": state["events"][-60:], "logs": state["logs"][-40:], "high": state["high"][-20:],
        })


def save():
    """Write what has arrived as a session folder, so the dashboard can replay it
    and DeepSeek can explain it like any other session. Returns its name."""
    with changed:
        rows = [m for m in state["minutes"] if "response_time_ms" in m]
        logs, complaints, answer = list(state["logs"]), list(state["complaints"]), state["answer"]
    if not rows:
        raise ValueError("No metric rows have arrived yet, so there is nothing to replay.")
    said = defaultdict(list)
    for c in complaints:
        said[c["timestamp"][:16]].append(c["complaint_text"])
    # write_session() wants each minute's complaints joined by " | ", as in final_dataset.csv.
    rows = [{**r, "complaint_text": " | ".join(said[r["timestamp"][:16]])} for r in rows]
    folder = os.path.join(analyze.SESSIONS, RECORDING)
    split_dataset.write_session(folder, rows, answer)
    if logs:
        split_dataset.write(f"{folder}/apache.csv", ["timestamp", "level", "message"],
                            [[l["timestamp"], l["level"], l["message"]] for l in logs])
    elif os.path.exists(f"{folder}/apache.csv"):
        os.remove(f"{folder}/apache.csv")  # left from an earlier recording
    if os.path.exists(f"{folder}/report.md"):
        os.remove(f"{folder}/report.md")  # it describes an earlier recording
    return RECORDING
