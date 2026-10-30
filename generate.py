"""Make the data for one exam day, 2006-01-24.

The only real input is the full Loghub Apache error log (data/zenodo/Apache.log).
Everything else is made up here, one row per minute, and written to one file
per "separate place" in the problem statement, in data/sessions/loghub_2006-01-24/:

  apache.csv      the real Apache log lines for the day
  server.csv      cpu, memory, db query time, error count
  network.csv     active users, bandwidth, response time
  complaints.csv  what students typed into the help desk
  answer.txt      the answer key below (analyze.py never reads it)

What happened that day (what analyze.py should find):
  Exam A, 12:30-14:00: at 12:50 every student submits section 1 and the
    database slows down (planted here: queries take 1.5-3 s until 13:02).
    The decoy, from the real log: at 12:51:57 one IP starts a 31-second bot
    scan for blog/wordpress/awstats pages. It starts after the slowdown, and
    its "File does not exist" errors only affect the bot itself.
  Exam B, 20:00-21:30: from 20:49 to 20:55 the real log shows Apache's worker
    processes dying ("Can't find child in scoreboard") and its mod_jk
    connector to the app server failing. The metrics stay normal.
  CPU, memory and bandwidth stay normal all day: they are decoys too.
"""
import csv
import os
import random
import re
from collections import Counter
from datetime import datetime, timedelta

random.seed(7)  # same "random" data on every run

APACHE_LOG = "data/zenodo/Apache.log"
OUT = "data/sessions/loghub_2006-01-24"
ANSWER = ("12:50-13:02 database slowdown (planted); 20:49-20:55 Apache worker "
          "crashes and mod_jk failure (real log); the 12:51 bot scan is a decoy")
DAY = datetime(2006, 1, 24)
EXAMS = [
    (datetime(2006, 1, 24, 12, 30), datetime(2006, 1, 24, 14, 0)),
    (datetime(2006, 1, 24, 20, 0), datetime(2006, 1, 24, 21, 30)),
]
DB_SLOW = (datetime(2006, 1, 24, 12, 50), datetime(2006, 1, 24, 13, 2))
COMPLAINTS = [
    "Got a 503 Service Unavailable page in the middle of my exam",
    "Clicked submit and the page showed a server error",
    "Exam page keeps failing, I have to refresh again and again",
    "The page is stuck loading, my timer is still running",
    "Error page when I moved to the next question",
]
# A log line looks like:
# [Tue Jan 24 20:49:18 2006] [error] mod_jk child workerEnv in error state 8
LINE = re.compile(r"^\[(.+?)\] \[(\w+)\] (.*)$")


def write(path, header, rows):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


# Keep the real log lines for DAY, and count the error lines in each minute.
apache = []
errors = Counter()  # every error line: what monitoring would count
server_errors = Counter()  # only the ones that slow everyone down
with open(APACHE_LOG) as f:
    for line in f:
        match = LINE.match(line)
        if not match:  # 4,478 lines in the log have no timestamp
            continue
        time_text, level, message = match.groups()
        t = datetime.strptime(time_text, "%a %b %d %H:%M:%S %Y")
        if t.date() != DAY.date():
            continue
        apache.append([t.isoformat(sep=" "), level, message])
        if level == "error":
            minute = t.replace(second=0)
            errors[minute] += 1
            # "[client 1.2.3.4] File does not exist" only affects that client.
            # Errors with no client, like a worker process dying, hit everyone.
            if "[client " not in message:
                server_errors[minute] += 1

server, network, complaints = [], [], []
for minute in range(24 * 60):
    t = DAY + timedelta(minutes=minute)
    exam = any(start <= t < end for start, end in EXAMS)
    users = random.randint(900, 1100) if exam else random.randint(10, 60)

    # Load-driven, but never near a limit: these are the decoys.
    cpu = 10 + users * 0.04 + random.uniform(-3, 3)
    memory = 35 + users * 0.015 + random.uniform(-2, 2)
    bandwidth = users * 0.07 + random.uniform(1, 4)
    db_ms = 15 + users * 0.01 + random.uniform(-3, 3)
    if DB_SLOW[0] <= t < DB_SLOW[1]:
        db_ms = random.uniform(1500, 3000)  # the planted cause of Exam A

    # A page runs 2 database queries, and each server-side Apache error in the
    # last 5 minutes adds 40 ms. The portal gives up after 8 seconds.
    recent_errors = sum(server_errors[t - timedelta(minutes=i)] for i in range(5))
    response_ms = min(100 + 2 * db_ms + 40 * recent_errors, 8000) + random.uniform(-30, 30)

    stamp = t.isoformat(sep=" ")
    server.append([stamp, round(cpu, 1), round(memory, 1), round(db_ms, 1), errors[t]])
    network.append([stamp, users, round(bandwidth, 1), round(response_ms)])

    # Students only complain when an exam is on and the page is really slow.
    if exam and response_ms > 1000:
        for _ in range(random.randint(2, 6)):
            when = t + timedelta(seconds=random.randint(0, 59))
            complaints.append([when.isoformat(sep=" "), random.choice(COMPLAINTS)])

complaints.sort()  # put them in time order within each minute

os.makedirs(OUT, exist_ok=True)
write(f"{OUT}/apache.csv", ["timestamp", "level", "message"], apache)
write(f"{OUT}/server.csv",
      ["timestamp", "cpu_usage_pct", "memory_usage_pct", "db_query_time_ms", "error_count"],
      server)
write(f"{OUT}/network.csv",
      ["timestamp", "active_users", "bandwidth_mbps", "response_time_ms"],
      network)
write(f"{OUT}/complaints.csv", ["timestamp", "complaint_text"], complaints)
with open(f"{OUT}/answer.txt", "w") as f:
    f.write(ANSWER + "\n")
print(f"{len(apache)} Apache lines, {len(server)} minutes, "
      f"{len(complaints)} complaints written to {OUT}/")
