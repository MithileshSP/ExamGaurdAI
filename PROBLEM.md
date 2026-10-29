# PS 1.4: AI-Powered Exam Portal Slowdown Root-Cause Analysis

**Challenge:** During online assessments, the exam portal or LMS becomes slow or unavailable.
Server, network and complaint data sit in separate places, so finding the cause takes too long.

**Capability:** Multi-source evidence correlation, reasoning and incident resolution

- Correlate server, network and user complaint data on one timeline
- Identify the root cause of the slowdown
- Produce an incident report with resolution and prevention steps

**Data source:**

- Loghub (GitHub): Apache web server logs. https://github.com/logpai/loghub

**Fields for synthetic data:** timestamp, active_users, response_time_ms, cpu_usage_pct,
memory_usage_pct, db_query_time_ms, bandwidth_mbps, error_count, complaint_text

## What the real data contains

- `data/zenodo/Apache.log`: the full Loghub Apache **error** log from Zenodo. It has 56,481 lines, from 2005-06-09 to 2006-02-28.
  Each line has only a time, a level and a message. There are no response times or traffic numbers in it.
- `data/Apache/`: the 2,000-line GitHub sample (a selection of lines from 2005-12-04). It is no longer used.
- It has two real kinds of trouble:
  - `mod_jk`, the connector from Apache to the Java app server behind it, keeps failing:
    `mod_jk child workerEnv in error state`, `jk2_init() Can't find child in scoreboard`.
  - Bots scanning for weak software: `File does not exist: /var/www/html/wordpress` (also `/blog`, `/xmlrpc`, `/awstats`).
- 4,478 lines have no timestamp (`script not found or unable to stat`) and are skipped.

## The exam day we use: 2006-01-24 (`generate.py`)

- Exam A, 12:30–14:00: at 12:50 the database slows down (planted: queries take 1.5–3 s until 13:02).
  Decoy from the real log: at 12:51:57 one IP (`211.99.203.228`) starts a 31-second bot scan of 187 requests.
  It starts after the slowdown, and its `File does not exist` errors only affect the bot itself.
- Exam B, 20:00–21:30: from 20:49 to 20:55 the real log shows worker processes dying and `mod_jk` failing (86 error lines).
- Only server-side errors (no `[client ...]` in the line) slow the portal, so the bot scans at 00:41, 00:53 and 08:22 (4 different IPs) slow nobody.
- CPU, memory and bandwidth are generated to stay normal. They are decoys too.
- `analyze.py` with `deepseek-flash` finds both incidents and names both causes correctly (checked 2026-10-29).

## The given dataset: `data/given/final_dataset.csv`

- 720 rows: 4 exam sessions (A–D) of 180 minutes each, 2026-10-29 09:30–12:29, all on the same timestamps.
- All nine synthetic fields, plus `scenario` (the answer) and `complaint_count`. Complaints are joined with ` | `.
- Every session is quiet until 10:00, users ramp to about 2,800 by 10:15, then each session's planted cause runs to the end:

| Session | `scenario` | What changes | Complaint |
|---|---|---|---|
| A | `A_db_bottleneck` | database 18 → about 1,000 ms | "answer not saving / page stuck" |
| B | `B_traffic_surge` | users about 5,200, CPU 99% | "cannot log in" |
| C | `C_memory_leak` | memory climbs from 10:15, 23% → 94%; slow from 10:45 | "everything very slow" |
| D | `D_network_saturation` | bandwidth pinned at 1,000 Mbps | "page timing out" |

- There is no Apache log for these sessions.
- `split_dataset.py` turns each session into separate server, network and complaint files. `scenario` goes only into `answer.txt`.
