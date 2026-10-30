## 1. Summary
One slowdown incident affected the online exam portal from **2026-10-29 10:18 to 12:29** (132 min). Response time rose from **222.6 ms** in the preceding 15 minutes to **2,918 ms** in the first 10 minutes and **4,209.9 ms** in the last 10 minutes, with **803** complaints of “answer not saving / page stuck.” The strongest evidence points to **database query latency/saturation under high concurrent exam load**, while CPU and memory stayed low; Apache logs are unavailable, so the exact database/app error path is not settled.

## 2. Timeline
- **2026-10-29 10:18–12:29** — Portal response time exceeded 1 s for 132 min (**2,918 ms** first 10 min; **4,209.9 ms** last 10 min), with **803** “answer not saving / page stuck” complaints.

## 3. Root cause
### Incident 1 — 2026-10-29 10:18–12:29
**Cause:** Database query latency/saturation under high exam concurrency is the supported root cause. The exact database mechanism — e.g. slow queries, lock contention, connection-pool exhaustion, or storage latency — is **not settled** by the available evidence.

**Exact evidence:**
- `db_query_time_ms` rose from **17.7** in `-30..-15`, to **109.1** in `-15..0`, to **857.0** in `first10`, and **1,223.2** in `last10`. This is the metric that worsens before the incident and continues worsening during it.
- `response_time_ms` rose from **163.8** → **222.6** → **2,918.0** → **4,209.9** over the same windows, tracking the database query-time increase.
- `active_users` rose from **110.1** to **2,445.1** before the incident and stayed high at **2,797.0** / **2,814.3** during it, indicating high concurrent load as the likely trigger.
- `error_count` rose from **0.0** / **0.1** before the incident to **3.5** in `first10` and **3.3** in `last10`.
- Student complaints were **803× “answer not saving / page stuck,”** consistent with stalled database reads/writes, but the Apache log is not available to confirm the exact error.

**Other causes:**
- **CPU — ruled out as primary:** CPU usage was low and fell during the incident: **20.8% → 18.9% → 13.9% → 13.4%**. CPU saturation would not be consistent with this pattern.
- **Memory — ruled out as primary:** memory usage was stable and low: **22.6% → 22.8% → 22.0% → 24.9%**. There is no evidence of memory pressure or a leak.
- **Database — supported, not ruled out:** it is the cause supported by the evidence above; DB query time rises first and tracks the slowdown.
- **Network — not conclusively ruled out, but not supported as primary:** bandwidth rose from **59.1** to **371.2** to **419.4** / **422.5 Mbps**, consistent with more users, but it plateaued from `first10` to `last10` while response time and DB query time continued to worsen. No link-capacity, latency, retransmit, or Apache error-log evidence is available to confirm network saturation.
- **Load — present and likely a trigger, but not sufficient alone:** at `-15..0`, active users were already **2,445.1** while response time was still **222.6 ms**. In `first10`, active users rose only to **2,797.0** — about 14% higher — while response time rose to **2,918.0 ms** and DB query time to **857.0 ms**. This suggests load-induced database contention/saturation rather than raw user count alone.

**Unsettled:** Apache log and client IPs are unavailable, so the exact error type, affected clients, and whether app-server/mod_jk connection issues or network problems also contributed cannot be determined.

## 4. Resolution
- Treat the **database/app-server data path** as the immediate suspect: inspect DB slow-query logs, active sessions, locks, connection-pool usage, and app-server/mod_jk connection metrics.
- Enable and collect the missing **Apache/mod_jk logs** and DB slow/error logs for the affected period.
- If the exam or a similar high-concurrency period is still active or imminent, reduce database write pressure by staggering starts, admitting users gradually, or rate-limiting/queuing answer saves; ensure retries are idempotent so students do not lose answers.
- Do **not** prioritize CPU or memory scaling first, since both were low. Scale or tune the database/app connection path based on the collected evidence.
- Verify network capacity and latency as a secondary check because network has not been conclusively excluded.

## 5. Prevention
- Load-test the portal at realistic exam concurrency, specifically the **answer-saving write path** and database query/connection limits.
- Add alerting on `db_query_time_ms`, `response_time_ms`, `active_users`, `error_count`, DB lock/connection metrics, and app-server connection-pool saturation.
- Stagger exam start times or use admission control to prevent a rapid ramp from **110** to **~2,800** active users.
- Optimize and tune the answer-save path: query plans/indexes, transaction scope, connection-pool sizing, and database capacity.
- Retain Apache/mod_jk logs with client IPs and grouped errors, plus DB slow-query logs, so future incidents can be attributed precisely.
- Capacity-plan the database and app tier independently from CPU/memory, because this incident occurred with CPU and memory well below saturation.

---

## Evidence sent to DeepSeek

```
Session: 2026-10-29 09:30 to 12:29. Slow means pages take over 1000 ms. 1 incidents found.

Incident 1: 2026-10-29 10:18 to 12:29 (132 min)
  metric             -30..-15   -15..0  first10   last10
  active_users          110.1   2445.1   2797.0   2814.3
  response_time_ms      163.8    222.6   2918.0   4209.9
  cpu_usage_pct          20.8     18.9     13.9     13.4
  memory_usage_pct       22.6     22.8     22.0     24.9
  db_query_time_ms       17.7    109.1    857.0   1223.2
  bandwidth_mbps         59.1    371.2    419.4    422.5
  error_count             0.0      0.1      3.5      3.3
  Apache log: not available for this session
  Student complaints: 803
     803x "answer not saving / page stuck"
```
