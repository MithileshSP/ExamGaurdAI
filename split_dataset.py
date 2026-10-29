"""Split data/given/final_dataset.csv into one folder per exam session.

The file holds 4 exam sessions (A-D) on the same timestamps, one row per
minute, every field in one table. Each session becomes the same separate
sources that generate.py writes for the Loghub day:

  data/sessions/dataset_A/server.csv      cpu, memory, db query time, error count
  data/sessions/dataset_A/network.csv     active users, bandwidth, response time
  data/sessions/dataset_A/complaints.csv  one row per complaint
  data/sessions/dataset_A/answer.txt      the dataset's scenario label

answer.txt is the answer key. analyze.py never reads it, so DeepSeek never
sees it; the page shows it after the analysis so you can check the result.
These sessions have no Apache log.
"""
import csv
import os
from collections import defaultdict

DATASET = "data/given/final_dataset.csv"


def write(path, header, rows):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


sessions = defaultdict(list)
with open(DATASET) as f:
    for row in csv.DictReader(f):
        sessions[row["scenario"]].append(row)

for scenario, rows in sessions.items():
    folder = f"data/sessions/dataset_{scenario[0]}"  # "A_db_bottleneck" -> dataset_A
    os.makedirs(folder, exist_ok=True)
    write(f"{folder}/server.csv",
          ["timestamp", "cpu_usage_pct", "memory_usage_pct", "db_query_time_ms", "error_count"],
          [[r["timestamp"], r["cpu_usage_pct"], r["memory_usage_pct"],
            r["db_query_time_ms"], r["error_count"]] for r in rows])
    write(f"{folder}/network.csv",
          ["timestamp", "active_users", "bandwidth_mbps", "response_time_ms"],
          [[r["timestamp"], r["active_users"], r["bandwidth_mbps"], r["response_time_ms"]]
           for r in rows])
    # complaint_text holds a minute's complaints joined by " | ".
    write(f"{folder}/complaints.csv", ["timestamp", "complaint_text"],
          [[r["timestamp"], text.strip()] for r in rows
           for text in r["complaint_text"].split("|") if text.strip()])
    with open(f"{folder}/answer.txt", "w") as f:
        f.write(scenario + "\n")
    print(f"{folder}: {len(rows)} minutes")
