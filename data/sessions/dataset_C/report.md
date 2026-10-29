# Incident Report — Online Exam Portal Slowdown, 2026-10-29

## 1. Summary
On 2026-10-29 from 10:45 to 12:29, the online exam portal experienced a 105-minute slowdown with 351 student complaints of “everything very slow.” Average response time rose from ~195 ms just before the incident to ~1995 ms in the first 10 minutes and ~2491 ms in the last 10 minutes. The only supplied metric that moved consistently with the slowdown was memory usage, which climbed from 36.4% to 94.2%, while CPU, database query time, bandwidth, and active users stayed stable; the exact memory-related failure mechanism is not settled by the available evidence.

## 2. Timeline
- **2026-10-29 10:45–12:29 — Incident 1:** pages slow above 1000 ms for 105 minutes; response time rose from 195.0 ms to 1995.0 ms initially and 2490.6 ms at the end, memory usage rose from 67.4% before the incident to 87.9% initially and 94.2% at the end, 351 complaints of “everything very slow”; Apache log unavailable.

## 3. Root Cause

### Incident 1 — 2026-10-29 10:45–12:29
**Cause supported by the evidence:** memory pressure/exhaustion in the application stack, most likely affecting the Java app server or its host/application process. This is consistent with a memory leak, undersized heap, GC pressure, or swapping, but the supplied metrics do **not** identify which component owned the memory growth or which exact mechanism occurred.

**Exact evidence:**

| Metric | -30..-15 min | -15..0 min | First 10 min | Last 10 min |
|---|---:|---:|---:|---:|
| active_users | 2783.3 | 2780.7 | 2829.4 | 2811.6 |
| response_time_ms | 167.6 | 195.0 | 1995.0 | 2490.6 |
| cpu_usage_pct | 13.9 | 13.4 | 13.1 | 13.4 |
| memory_usage_pct | 36.4 | 67.4 | 87.9 | 94.2 |
| db_query_time_ms | 17.4 | 17.9 | 17.1 | 18.1 |
| bandwidth_mbps | 416.4 | 418.2 | 424.9 | 426.0 |
| error_count | 0.0 | 0.1 | 3.8 | 2.5 |

Additional evidence: **351× “everything very slow”** complaints; **Apache log not available** for this session, so error grouping and client IPs are unavailable.

**Other causes ruled out or not supported:**
- **CPU:** `cpu_usage_pct` stayed essentially flat at 13.9%, 13.4%, 13.1%, 13.4%. There is no sustained CPU spike correlating with the slowdown. Caveat: averages do not exclude very short CPU bursts or GC CPU spikes.
- **Database:** `db_query_time_ms` stayed stable at 17.4, 17.9, 17.1, 18.1 ms. Database query latency is therefore not the apparent bottleneck. Caveat: this does not rule out connection-pool waits or non-query database waits, which are not provided.
- **Network/bandwidth:** `bandwidth_mbps` stayed stable at 416.4, 418.2, 424.9, 426.0 Mbps. This does not support a bandwidth-capacity or traffic-volume cause. Caveat: bandwidth alone cannot rule out latency, packet loss, or routing issues; no network telemetry is given.
- **User load:** `active_users` stayed stable at 2783.3, 2780.7, 2829.4, 2811.6 while response time rose more than 10×. A user-count-driven load increase is not supported.
- **Apache/mod_jk connector errors:** `error_count` increased from 0.0/0.1 to 3.8 and 2.5, but the Apache log is unavailable. Therefore the error type, mod_jk behavior, and any client-IP-specific pattern are **not settled**; the error increase may be a downstream symptom.

## 4. Resolution
- Treat the service as memory-pressure degraded: check current memory usage and response time; if still degraded, perform a controlled drain and restart/roll of the affected Java app server instance(s) if operationally safe.
- Before any restart, capture heap dump, GC logs, OS memory/swap state, and Java app server logs so the memory growth can be diagnosed.
- Collect Apache httpd and mod_jk logs, including client IPs, for the incident window; they are currently unavailable.
- Verify whether memory usage falls after 12:29 and whether response time recovers. No post-12:29 metrics are supplied, so current state is not settled.
- Do not attribute the outage to CPU, database query latency, bandwidth saturation, or increased active-user load based on the supplied evidence; those metrics stayed stable.

## 5. Prevention
- Add alerting on rising `memory_usage_pct` and on `response_time_ms` crossing the 1000 ms slow threshold; alert before memory reaches the 87.9–94.2% range seen during the incident.
- Enable and retain Apache httpd error logs, mod_jk logs, and client IP capture for all exam sessions.
- Add Java app server heap/GC monitoring and heap-dump capture on memory thresholds; determine whether this is a leak, undersized heap, GC pressure, or swapping.
- Load-test the exam portal at realistic exam concurrency and monitor memory over time, not only CPU and response time.
- Add DB connection-pool and network latency/packet-loss metrics so those causes can be excluded more strongly in future incidents.
- Because the exact memory owner is not identified by the supplied metrics, instrument memory by process/component (Apache, Java app server, OS) before the next exam session.

---

## Evidence sent to DeepSeek

```
Session: 2026-10-29 09:30 to 12:29. Slow means pages take over 1000 ms. 1 incidents found.

Incident 1: 2026-10-29 10:45 to 12:29 (105 min)
  metric             -30..-15   -15..0  first10   last10
  active_users         2783.3   2780.7   2829.4   2811.6
  response_time_ms      167.6    195.0   1995.0   2490.6
  cpu_usage_pct          13.9     13.4     13.1     13.4
  memory_usage_pct       36.4     67.4     87.9     94.2
  db_query_time_ms       17.4     17.9     17.1     18.1
  bandwidth_mbps        416.4    418.2    424.9    426.0
  error_count             0.0      0.1      3.8      2.5
  Apache log: not available for this session
  Student complaints: 351
     351x "everything very slow"
```
