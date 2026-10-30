"""Find the slow periods in an exam session and explain them with DeepSeek.

A session is a folder in data/sessions/ with server.csv, network.csv,
complaints.csv and, for the Loghub day, apache.csv. For each session:
  a. merge its files into one per-minute timeline   load()
  b. find incidents: runs of slow minutes           find_incidents()
  c. build a short evidence pack per incident       build_pack()
  d. send the evidence to DeepSeek, stream it back   ask_deepseek()
  e. write the answer, plus the evidence, to the session's report.md

Run: set -a; . ./.env; set +a; python3 analyze.py [session ...]
With no session names it analyzes every session. app.py imports these functions.
"""
import csv
import json
import os
import re
import sys
import urllib.request
from collections import Counter
from statistics import mean

MODEL = "deepseek-flash"  # or "deepseek-v4-pro": slower, stronger
SESSIONS = "data/sessions"
SLOW_MS = 1000  # a minute is slow when pages take longer than 1 second
GAP = 2  # at most this many normal minutes between slow ones: still one incident
LEAD = 5  # also show Apache lines from this many minutes before the slowdown
METRICS = ["active_users", "response_time_ms", "cpu_usage_pct", "memory_usage_pct",
           "db_query_time_ms", "bandwidth_mbps", "error_count"]

SYSTEM_PROMPT = """You investigate slowdowns of a university's online exam portal.
The portal runs on Apache httpd, which forwards requests through the mod_jk
connector to a Java app server; a database sits behind the app server.

You get evidence for each slow period of one exam session: average metrics in
four windows (30-15 and 15-0 minutes before it, its first and its last 10
minutes) so you can see what changed first and what keeps changing, the Apache
error log lines (grouped, numbers replaced by N) and their client IPs when a
log is available, and student complaints.

Write an incident report in Markdown with these sections:
1. Summary: two or three sentences.
2. Timeline: one line per incident.
3. Root cause: for each incident, the cause, the exact evidence for it, and
   which other causes (CPU, memory, database, network, load) the evidence
   rules out and why.
4. Resolution: what to do now.
5. Prevention: what to change so it does not happen again.
Use only the evidence given. If the evidence does not settle something, say so."""


def read(path):
    with open(path) as f:
        return list(csv.DictReader(f))


def sessions():
    # Every folder in data/sessions/; hidden ones (.DS_Store, tool state) are not sessions.
    return sorted(name for name in os.listdir(SESSIONS) if not name.startswith("."))


def load(session):
    """a. Merge server.csv and network.csv into one row per minute, in time order.

    Returns the rows, the Apache lines (None when the session has no log),
    and the complaints."""
    folder = os.path.join(SESSIONS, session)
    by_minute = {row["timestamp"][:16]: row for row in read(f"{folder}/server.csv")}
    for row in read(f"{folder}/network.csv"):
        by_minute[row["timestamp"][:16]].update(row)
    rows = [by_minute[minute] for minute in sorted(by_minute)]
    apache_path = f"{folder}/apache.csv"
    apache = read(apache_path) if os.path.exists(apache_path) else None
    return rows, apache, read(f"{folder}/complaints.csv")


def find_incidents(rows):
    """b. Slow minutes, joined into incidents [first, last] (indexes into rows)."""
    incidents = []
    for i, row in enumerate(rows):
        if float(row["response_time_ms"]) <= SLOW_MS:
            continue
        if incidents and i - incidents[-1][1] <= GAP + 1:
            incidents[-1][1] = i
        else:
            incidents.append([i, i])
    return incidents


def average(rows, key):
    """Average of one metric over some minutes, or "-" when there are none."""
    if not rows:
        return f"{'-':>8}"
    return f"{mean(float(row[key]) for row in rows):8.1f}"


def evidence(number, rows, first, last, apache, complaints):
    start, end = rows[first]["timestamp"][:16], rows[last]["timestamp"][:16]
    during = rows[first:last + 1]
    # Four snapshots, so slow trends like a memory leak show up, not just a jump.
    windows = [rows[max(first - 30, 0):max(first - 15, 0)],  # 30-15 min before
               rows[max(first - 15, 0):first],               # 15-0 min before
               during[:10],                                  # first 10 min
               during[-10:]]                                 # last 10 min
    lines = [f"Incident {number}: {start} to {end[11:]} ({len(during)} min)",
             f"  {'metric':18} {'-30..-15':>8} {'-15..0':>8} {'first10':>8} {'last10':>8}"]
    for key in METRICS:
        lines.append(f"  {key:18} " + " ".join(average(w, key) for w in windows))

    if apache is None:
        lines.append("  Apache log: not available for this session")
    else:
        # Apache lines, grouped by message with the numbers masked out.
        log_from = rows[max(first - LEAD, 0)]["timestamp"][:16]
        logs = [r for r in apache if log_from <= r["timestamp"][:16] <= end]
        ips, messages = Counter(), Counter()
        for r in logs:
            ip = re.search(r"\[client ([\d.]+)\] ", r["message"])
            if ip:
                ips[ip[1]] += 1
            text = re.sub(r"\[client [\d.]+\] ", "", r["message"])
            messages[f"[{r['level']}] " + re.sub(r"\b\d+\b", "N", text)] += 1
        lines.append(f"  Apache log {log_from[11:]}-{end[11:]}: {len(logs)} lines")
        lines += [f"    {n:4}x {text}" for text, n in messages.most_common()]
        top_ips = ", ".join(f"{ip} ({n})" for ip, n in ips.most_common(5))
        lines.append(f"  Client IPs: {top_ips or 'none'}")

    said = Counter(r["complaint_text"] for r in complaints
                   if start <= r["timestamp"][:16] <= end)
    lines.append(f"  Student complaints: {sum(said.values())}")
    lines += [f'    {n:4}x "{text}"' for text, n in said.most_common()]
    return "\n".join(lines)


def build_pack(rows, apache, complaints):
    """c. A line of context, then one evidence block per incident."""
    incidents = find_incidents(rows)
    header = (f"Session: {rows[0]['timestamp'][:16]} to {rows[-1]['timestamp'][11:16]}. "
              f"Slow means pages take over {SLOW_MS} ms. {len(incidents)} incidents found.")
    return "\n\n".join([header] + [evidence(n, rows, first, last, apache, complaints)
                                   for n, (first, last) in enumerate(incidents, 1)])


def ask_deepseek(text):
    """d. Send the evidence pack. Yields ("thinking", text) pieces while DeepSeek
    reasons, then ("report", text) pieces of the Markdown report, as they arrive."""
    body = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                     {"role": "user", "content": text}],
        "thinking": {"type": "enabled"},
        "stream": True,
    }
    request = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        # Server-sent events: one line 'data: {...}' per piece, then 'data: [DONE]'.
        for line in response:
            line = line.decode().strip()
            if not line.startswith("data: {"):
                continue
            delta = json.loads(line[6:])["choices"][0]["delta"]
            if delta.get("reasoning_content"):
                yield "thinking", delta["reasoning_content"]
            if delta.get("content"):
                yield "report", delta["content"]


def analyze(session):
    """Run steps a-e for one session, yielding DeepSeek's pieces as they arrive."""
    pack = build_pack(*load(session))
    print(f"== {session}\n{pack}\n")
    report = ""
    for kind, text in ask_deepseek(pack):
        if kind == "report":
            report += text
        yield kind, text
    # e. Save DeepSeek's report together with the evidence it was given. This only
    # happens once the whole report has arrived, so a failed call keeps the old one.
    evidence = "\n\n---\n\n## Evidence sent to DeepSeek\n\n```\n" + pack + "\n```\n"
    yield "report", evidence
    with open(os.path.join(SESSIONS, session, "report.md"), "w") as f:
        f.write(report + evidence)
    print(f"wrote {SESSIONS}/{session}/report.md ({MODEL})\n")


if __name__ == "__main__":
    for name in sys.argv[1:] or sessions():
        for kind, text in analyze(name):
            if kind == "report":
                print(text, end="", flush=True)
