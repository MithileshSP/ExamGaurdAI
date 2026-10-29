# Incident Report — Online Exam Portal Slowdown, 2026-10-29

## 1. Summary
On 2026-10-29 from 10:17 to 12:29, the exam portal had response times above the 1000 ms slow threshold, averaging 2082.8 ms in the first 10 minutes and 2348.2 ms in the last 10 minutes. Metrics show an active-user surge to roughly 4.9k–5.2k with CPU at ~99%, while 440 students complained “cannot log in”; Apache logs were unavailable, so the exact login-path failure cannot be confirmed.

## 2. Timeline
- **2026-10-29 10:17–12:29** — Portal slow (>1000 ms; avg 2.08–2.35 s), 440 “cannot log in” complaints; active users ~4.9k–5.2k, CPU ~99%.

## 3. Root cause

### Incident 1: 2026-10-29 10:17–12:29
**Cause: load-driven saturation of the portal, with CPU saturation as the immediate bottleneck.** The evidence supports a traffic/load surge rather than memory or database exhaustion.

**Exact evidence:**
- `active_users`: 67.8 in -30..-15, 2353.2 in -15..0, 4927.5 in first10, 5210.7 in last10.
- `response_time_ms`: 162.9 → 194.8 → 2082.8 → 2348.2.
- `cpu_usage_pct`: 20.7 → 30.1 → 99.1 → 99.5.
- `error_count`: 0.0 → 0.3 → 3.5 → 2.8.
- Student complaints: 440 × “cannot log in”.
- `memory_usage_pct`: 22.6 → 23.1 → 34.9 → 39.9.
- `db_query_time_ms`: 18.2 → 18.6 → 49.5 → 52.1.
- `bandwidth_mbps`: 48.2 → 362.9 → 706.9 → 747.9.
- Apache log: not available for this session; no client IPs available.

In the 15 minutes before the incident, active users were already elevated at 2353.2, but response time was still 194.8 ms and CPU was 30.1%. In the first 10 minutes of the incident, active users roughly doubled to 4927.5, response time exceeded 1000 ms, and CPU reached 99.1%. This points to the load increase crossing system capacity. CPU saturation is present and is the immediate limiting resource, but the evidence ties it to the active-user surge rather than to an independent CPU fault.

**Other causes ruled out or not supported:**
- **Memory:** `memory_usage_pct` reached only 34.9–39.9%, so the evidence does not support memory exhaustion as the cause.
- **Database:** `db_query_time_ms` rose from 18.6 to 49.5–52.1 ms, but remains low in absolute terms; there is no evidence of database saturation as the primary cause.
- **Network:** `bandwidth_mbps` was high at 706.9–747.9 Mbps, but the evidence does not include link capacity or network error data, so network saturation is not settled. It is less supported than load/CPU because the active-user and CPU jumps align with the slow period.
- **CPU:** CPU is saturated at 99.1–99.5%, so it is a real bottleneck. However, it is not an independent root cause on this evidence; it rose with the active-user surge.
- **Load:** supported as the primary cause, not ruled out.
- **Unsettled:** because the Apache log is unavailable, the exact login failure — e.g., Apache worker exhaustion, mod_jk connector issue, application thread exhaustion, or authentication-path failure — cannot be confirmed.

## 4. Resolution
- Immediately reduce login concurrency: stagger exam starts, queue or rate-limit login attempts, or temporarily add capacity.
- Scale the Apache/app-server capacity and check mod_jk connector limits, application thread pools, and database connection pools for exhaustion.
- Collect Apache, mod_jk, JVM/thread-pool, and client-IP data as soon as possible; the current evidence does not identify the exact failing login component.
- Communicate to students that login is affected and provide a controlled retry/queue path.

## 5. Prevention
- Capacity-plan and load-test for at least the observed peak of ~5.2k active users, with CPU headroom before exams.
- Pre-scale Apache/app-server capacity before exam sessions and add admission control or a waiting room for login bursts.
- Stagger exam start times or limit simultaneous login attempts.
- Enable and retain Apache error logs with client IPs, plus mod_jk/JVM/thread-pool metrics, so future incidents can be diagnosed to the failing component.
- Alert on active users, response time >1000 ms, CPU saturation, and error-count increases.

---

## Evidence sent to DeepSeek

```
Session: 2026-10-29 09:30 to 12:29. Slow means pages take over 1000 ms. 1 incidents found.

Incident 1: 2026-10-29 10:17 to 12:29 (133 min)
  metric             -30..-15   -15..0  first10   last10
  active_users           67.8   2353.2   4927.5   5210.7
  response_time_ms      162.9    194.8   2082.8   2348.2
  cpu_usage_pct          20.7     30.1     99.1     99.5
  memory_usage_pct       22.6     23.1     34.9     39.9
  db_query_time_ms       18.2     18.6     49.5     52.1
  bandwidth_mbps         48.2    362.9    706.9    747.9
  error_count             0.0      0.3      3.5      2.8
  Apache log: not available for this session
  Student complaints: 440
     440x "cannot log in"
```
