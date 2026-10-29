# Incident Report — Online Exam Portal Slowdowns, 2006-01-24

## 1. Summary
Two exam-portal slowdown incidents occurred on 2006-01-24. Incident 1 correlates with a large database query-time spike while CPU, memory, bandwidth, and active-user count stayed roughly flat during the slow window. Incident 2 correlates with repeated mod_jk/JK2 worker/child scoreboard initialization errors while database, CPU, memory, bandwidth, and active-user metrics stayed normal. The evidence localizes each incident to a different layer, but does not fully identify the internal database cause in Incident 1 or the precise mod_jk/JK2 failure trigger in Incident 2.

## 2. Timeline
- **2006-01-24 12:50–13:01 (Incident 1):** Response time rose to ~4.5–4.7 s; `db_query_time_ms` rose to ~2.2 s; error count appeared; students reported 503s, server errors, and stuck loading. Apache log was dominated by 404/script-not-found probes from one client IP, plus isolated mod_jk lines.
- **2006-01-24 20:49–20:53 (Incident 2):** Response time rose to ~3.5 s; database/CPU/memory/bandwidth stayed normal; Apache log showed repeated mod_jk/JK2 child-init and scoreboard errors; students reported 503s and stuck loading.

## 3. Root cause

### Incident 1 — 2006-01-24 12:50–13:01

**Root cause:** Database query latency spike. The evidence points to the database/query layer as the bottleneck during this incident. The exact database-internal reason—e.g., lock contention, slow query, connection saturation, or DB resource issue—is **not settled** by the supplied evidence.

**Exact evidence:**

| Metric | -30..-15 | -15..0 | first10 | last10 |
|---|---:|---:|---:|---:|
| active_users | 350.9 | 1003.9 | 993.8 | 998.5 |
| response_time_ms | 131.9 | 151.1 | **4694.3** | **4484.8** |
| cpu_usage_pct | 24.0 | 50.7 | 49.6 | 49.8 |
| memory_usage_pct | 40.3 | 51.2 | 50.0 | 49.9 |
| db_query_time_ms | 18.9 | 24.1 | **2282.7** | **2177.6** |
| bandwidth_mbps | 27.0 | 72.8 | 71.4 | 72.1 |
| error_count | 0.0 | 0.0 | **18.9** | **18.5** |

- `db_query_time_ms` increased from 24.1 ms immediately before the incident to 2282.7 ms in the first 10 minutes and 2177.6 ms in the last 10 minutes.
- `response_time_ms` increased from 151.1 ms to 4694.3 ms / 4484.8 ms over the same windows.
- Student complaints match backend failures and slowness: 13× “503 Service Unavailable,” 11× “server error” on submit, 11× error moving to next question, 8× repeated failure, 7× stuck loading.
- Apache log was 191 lines, of which 187 came from client IP `211.99.203.228` and were 404/script-not-found probes for paths such as `/blog`, `/awstats/awstats.pl`, `/drupal`, `/wordpress`, `/xmlrpc`, etc. These look like automated scanning, not exam-application traffic, and the volume is low (~187 lines over the 12:45–13:01 log window). This does **not** explain a 2.2 s database query-time spike by itself.
- The remaining Apache log lines include isolated mod_jk/JK2 entries: one `jk2_init() Can't find child N in scoreboard`, one `workerEnv.init() ok`, one `mod_jk child init N -N`, and one `mod_jk2 Shutting down`. These are not accompanied by the repeated child/scoreboard churn seen in Incident 2, so they are not strong evidence of the primary cause here. Their timing/impact is not fully settled.

**Other causes ruled out or not supported:**
- **CPU:** Not supported as primary cause. CPU was ~50.7% just before the incident and stayed ~49.6–49.8% during it; no CPU spike coincides with the onset.
- **Memory:** Not supported as primary cause. Memory was 51.2% just before and stayed ~49.9–50.0% during the incident; no memory-growth or pressure spike is shown.
- **Network:** Not supported as primary cause. Bandwidth was 72.8 Mbps just before and stayed ~71.4–72.1 Mbps during the incident. No network latency/error metrics are supplied, so a network fault cannot be fully excluded, but the available evidence does not show a network change at onset.
- **Load:** Not the sole trigger. Active users had already risen to ~1003.9 in the 15 minutes before the incident while response time was 151.1 ms and DB time was 24.1 ms. During the incident active users stayed ~993.8–998.5. High load may be a contributing precondition, but the step change is in database query time.
- **Scanner traffic:** The single-IP 404 probe pattern is real but not sufficient evidence to explain the incident; it is likely background scanning/noise. Whether it had any secondary effect is not settled.

### Incident 2 — 2006-01-24 20:49–20:53

**Root cause:** mod_jk/JK2 connector worker/child/scoreboard instability. The evidence localizes the failure to the Apache-to-Java-app-server connector layer. The precise reason the child worker/scoreboard entries became inconsistent is **not settled** by the supplied evidence.

**Exact evidence:**

| Metric | -30..-15 | -15..0 | first10 | last10 |
|---|---:|---:|---:|---:|
| active_users | 1004.7 | 1013.9 | 1016.2 | 1016.2 |
| response_time_ms | 151.6 | 151.6 | **3482.6** | **3482.6** |
| cpu_usage_pct | 49.6 | 50.6 | 50.5 | 50.5 |
| memory_usage_pct | 50.1 | 50.1 | 50.3 | 50.3 |
| db_query_time_ms | 25.2 | 25.1 | 24.6 | 24.6 |
| bandwidth_mbps | 73.0 | 73.3 | 73.6 | 73.6 |
| error_count | 0.0 | 0.0 | **16.6** | **16.6** |

- Apache log for 20:44–20:53 contained:
  - 53× `workerEnv.init() ok /etc/httpd/conf/workers2.properties`
  - 40× `jk2_init() Can't find child N in scoreboard`
  - 40× `mod_jk child init N -N`
  - 13× `jk2_init() Found child N in scoreboard slot N`
  - 3× `mod_jk child workerEnv in error state N`
- This repeated initialization/scoreboard/error-state pattern is direct evidence of connector worker lifecycle instability.
- Student complaints included 5× “503 Service Unavailable,” 5× stuck loading, 3× repeated failure, 3× error moving to next question, and 2× server error on submit. These are consistent with the connector failing to route requests correctly.
- No client IPs were available for this incident, so the evidence does not show whether a specific client or external traffic triggered it.

**Other causes ruled out or not supported:**
- **CPU:** Not supported. CPU was 50.6% just before and 50.5% during the incident.
- **Memory:** Not supported. Memory was 50.1% just before and 50.3% during the incident.
- **Database:** Ruled out as primary cause. `db_query_time_ms` was 25.1 ms just before and 24.6 ms during the incident—flat and low.
- **Network:** Not supported. Bandwidth was 73.3 Mbps just before and 73.6 Mbps during the incident; no network error/latency evidence is given.
- **Load:** Not supported. Active users were ~1013.9 just before and ~1016.2 during the incident—stable, with no load increase at onset.

## 4. Resolution

**Now, for Incident 1:**
- Treat the database as the immediate bottleneck: inspect DB slow-query logs, active sessions, lock waits, and connection-pool saturation.
- Identify and stop or optimize the queries/transactions responsible for the ~2.2 s query time.
- If the exam is still running, reduce DB load or fail over/scale the database if the available setup allows it, while verifying that the Java app server’s connection pool is healthy.
- Do not focus the primary response on the single-IP 404 scanning noise; it is not supported as the main cause. It can be blocked/rate-limited as hygiene, but that alone is unlikely to restore service.

**Now, for Incident 2:**
- Inspect and correct mod_jk/JK2 worker and scoreboard configuration, including `/etc/httpd/conf/workers2.properties`.
- Restart/reload Apache/mod_jk or fail over to a healthy app server/worker to clear stale child/scoreboard state and recover from `workerEnv in error state`.
- Verify that workers recover and that the repeated `jk2_init()` / `mod_jk child init` loop stops.
- Because the log shows repeated workerEnv initialization and scoreboard inconsistencies, the connector should be monitored and, if necessary, restarted carefully during the exam window.

## 5. Prevention

- **Database monitoring and tuning:** Alert on `db_query_time_ms` and response-time increases; retain slow-query logs; review indexes, locks, and connection-pool limits before exam periods.
- **Load testing at exam scale:** Test the portal at ~1,000+ concurrent active users, since both incidents occurred around ~1,000 active users. Validate both DB query latency and mod_jk worker behavior at that load.
- **Connector hardening:** Review the mod_jk/JK2 worker configuration and scoreboard behavior. Prefer a supported, well-understood connector configuration; add health checks and alerting for `jk2_init() Can't find child`, `mod_jk child init`, `workerEnv in error state`, and repeated `workerEnv.init()` messages.
- **Alerting on symptoms:** Alert on 503s, `response_time_ms > 1000`, error-count spikes, and connector error-state messages. Include client IPs and timestamps in logs so external traffic can be correlated or excluded quickly.
- **Traffic hygiene:** Rate-limit or block automated scanners such as the `211.99.203.228` 404-probe pattern as defense in depth, while recognizing that the evidence does not show it as the root cause of Incident 1.
- **Operational readiness:** Define runbooks for DB slow-query incidents and mod_jk worker failures, including when to fail over, scale, or restart components during an active exam.

---

## Evidence sent to DeepSeek

```
Session: 2006-01-24 00:00 to 23:59. Slow means pages take over 1000 ms. 2 incidents found.

Incident 1: 2006-01-24 12:50 to 13:01 (12 min)
  metric             -30..-15   -15..0  first10   last10
  active_users          350.9   1003.9    993.8    998.5
  response_time_ms      131.9    151.1   4694.3   4484.8
  cpu_usage_pct          24.0     50.7     49.6     49.8
  memory_usage_pct       40.3     51.2     50.0     49.9
  db_query_time_ms       18.9     24.1   2282.7   2177.6
  bandwidth_mbps         27.0     72.8     71.4     72.1
  error_count             0.0      0.0     18.9     18.5
  Apache log 12:45-13:01: 191 lines
      34x [error] File does not exist: /var/www/html/blog
      17x [error] File does not exist: /var/www/html/awstats/awstats.pl
      17x [error] script not found or unable to stat: /var/www/cgi-bin/awstats.pl
      17x [error] script not found or unable to stat: /var/www/cgi-bin/awstats
      17x [error] File does not exist: /var/www/html/blogs
      17x [error] File does not exist: /var/www/html/drupal
      17x [error] File does not exist: /var/www/html/phpgroupware
      17x [error] File does not exist: /var/www/html/wordpress
      17x [error] File does not exist: /var/www/html/xmlrpc
      17x [error] File does not exist: /var/www/html/xmlsrv
       1x [error] jk2_init() Can't find child N in scoreboard
       1x [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties
       1x [error] mod_jk child init N -N
       1x [notice] mod_jk2 Shutting down
  Client IPs: 211.99.203.228 (187)
  Student complaints: 50
      13x "Got a 503 Service Unavailable page in the middle of my exam"
      11x "Clicked submit and the page showed a server error"
      11x "Error page when I moved to the next question"
       8x "Exam page keeps failing, I have to refresh again and again"
       7x "The page is stuck loading, my timer is still running"

Incident 2: 2006-01-24 20:49 to 20:53 (5 min)
  metric             -30..-15   -15..0  first10   last10
  active_users         1004.7   1013.9   1016.2   1016.2
  response_time_ms      151.6    151.6   3482.6   3482.6
  cpu_usage_pct          49.6     50.6     50.5     50.5
  memory_usage_pct       50.1     50.1     50.3     50.3
  db_query_time_ms       25.2     25.1     24.6     24.6
  bandwidth_mbps         73.0     73.3     73.6     73.6
  error_count             0.0      0.0     16.6     16.6
  Apache log 20:44-20:53: 149 lines
      53x [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties
      40x [error] jk2_init() Can't find child N in scoreboard
      40x [error] mod_jk child init N -N
      13x [notice] jk2_init() Found child N in scoreboard slot N
       3x [error] mod_jk child workerEnv in error state N
  Client IPs: none
  Student complaints: 18
       5x "Got a 503 Service Unavailable page in the middle of my exam"
       5x "The page is stuck loading, my timer is still running"
       3x "Exam page keeps failing, I have to refresh again and again"
       3x "Error page when I moved to the next question"
       2x "Clicked submit and the page showed a server error"
```
