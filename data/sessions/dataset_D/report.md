## 1. Summary
On 2026-10-29, the exam portal had a 133-minute slow period from 10:17 to 12:29, with response times above 2 s and 363 “page timing out” complaints. The evidence points to a sharp concurrent-user load increase that saturated measured bandwidth at 1000.0 Mbps, while CPU, memory, and database metrics stayed low or stable. Apache logs are unavailable, so the exact Apache/mod_jk or network component cannot be confirmed from the provided evidence.

## 2. Timeline
- **2026-10-29 10:17–12:29 — Incident 1:** pages >1000 ms; response_time 2122.0 ms in first 10 min and 2267.4 ms in last 10 min; 363 “page timing out” complaints; active_users 2803.5 / 2781.7 and bandwidth 1000.0 / 1000.0 Mbps in those windows. The preceding 15 min had already risen to active_users 2321.5 and bandwidth 432.3 Mbps.

## 3. Root cause

### Incident 1 — 2026-10-29 10:17–12:29
**Cause supported by the evidence:** load-driven bandwidth saturation. A sharp rise in active users coincided with bandwidth reaching 1000.0 Mbps in both slow windows and response times rising above 2 s.

| Metric | -30..-15 | -15..0 | First 10 min | Last 10 min |
|---|---:|---:|---:|---:|
| active_users | 66.9 | 2321.5 | 2803.5 | 2781.7 |
| response_time_ms | 162.9 | 200.6 | 2122.0 | 2267.4 |
| cpu_usage_pct | 20.7 | 19.1 | 14.2 | 13.4 |
| memory_usage_pct | 22.6 | 22.9 | 21.7 | 24.9 |
| db_query_time_ms | 17.3 | 17.1 | 18.1 | 18.5 |
| bandwidth_mbps | 49.2 | 432.3 | 1000.0 | 1000.0 |
| error_count | 0.0 | 0.3 | 3.5 | 2.8 |

**Exact evidence:**
- `active_users` rose from 66.9 to 2321.5 before the incident, then to 2803.5 and 2781.7 during the slow windows.
- `bandwidth_mbps` rose from 49.2 to 432.3 before the incident, then reached 1000.0 in both slow windows.
- `response_time_ms` rose from 162.9 / 200.6 ms before the incident to 2122.0 / 2267.4 ms during it.
- `error_count` rose from 0.0 to 3.5 / 2.8, and students filed 363 complaints, all “page timing out.”
- Apache log is not available, so connector errors and client IP patterns cannot be analyzed.

**Causes ruled out or not supported:**
- **CPU:** not supported. `cpu_usage_pct` was low and fell during the slowdown: 20.7 → 19.1 → 14.2 → 13.4.
- **Memory:** not supported. `memory_usage_pct` stayed low and roughly stable: 22.6 → 22.9 → 21.7 → 24.9.
- **Database:** not supported. `db_query_time_ms` stayed essentially flat: 17.3 → 17.1 → 18.1 → 18.5.
- **Network:** a generic network fault is not proven, but network capacity is implicated because measured bandwidth reached 1000.0 Mbps. The evidence does not settle whether this is a hard link cap, an upstream limit, or another bandwidth bottleneck.
- **Load:** not ruled out. The active-user surge changed before the slow period and remained high, making load the most likely trigger. However, the evidence does not establish whether Apache/mod_jk worker exhaustion or app-server thread/queue limits also contributed; Apache logs are unavailable.

## 4. Resolution
- Treat this as a capacity/load incident: reduce concurrent exam traffic or increase available bandwidth before the next exam session.
- Verify the 1000.0 Mbps measurement against the actual network path and any configured cap; if it is a cap, raise it or reduce per-user bandwidth demand.
- Enable and preserve Apache access/error logs and mod_jk diagnostics for the next session; without them, connector errors and client IP patterns cannot be investigated.
- If another exam is imminent, pre-scale Apache/app-server capacity and monitor `active_users`, `bandwidth_mbps`, `response_time_ms`, and `error_count` in real time. If capacity is uncertain, limit or stagger concurrent users.

## 5. Prevention
- Capacity-plan and load-test for at least the observed peak of roughly 2,800 active users, including network bandwidth headroom.
- Add alerts on bandwidth approaching 1000.0 Mbps, response time exceeding 1000 ms, rising `error_count`, and unusually high `active_users`.
- Keep Apache logs and mod_jk/app-server metrics available for every exam session, including worker pool, thread queue, and network utilization.
- Reduce per-session bandwidth demand through static-content caching/CDN, compression, and avoidance of unnecessary large downloads.
- Stagger exam start times or implement admission control/rate limiting when expected load exceeds validated capacity.
- Maintain an exam-day runbook that distinguishes load/bandwidth saturation from CPU, memory, and database bottlenecks using the same metric set.

---

## Evidence sent to DeepSeek

```
Session: 2026-10-29 09:30 to 12:29. Slow means pages take over 1000 ms. 1 incidents found.

Incident 1: 2026-10-29 10:17 to 12:29 (133 min)
  metric             -30..-15   -15..0  first10   last10
  active_users           66.9   2321.5   2803.5   2781.7
  response_time_ms      162.9    200.6   2122.0   2267.4
  cpu_usage_pct          20.7     19.1     14.2     13.4
  memory_usage_pct       22.6     22.9     21.7     24.9
  db_query_time_ms       17.3     17.1     18.1     18.5
  bandwidth_mbps         49.2    432.3   1000.0   1000.0
  error_count             0.0      0.3      3.5      2.8
  Apache log: not available for this session
  Student complaints: 363
     363x "page timing out"
```
