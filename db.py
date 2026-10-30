"""Database connector and CSV importer for ExamGuard AI.
Supports MySQL when available, falling back gracefully to CSV files if MySQL is not configured or offline.
"""
import os
import pymysql
from pymysql.cursors import DictCursor
import analyze

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "examguard")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "examguard123")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "examguard")


def get_db_connection():
    """Returns a connection to MySQL, or None if MySQL is unreachable."""
    try:
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            cursorclass=DictCursor,
            connect_timeout=3
        )
        return conn
    except Exception:
        return None


def is_db_available():
    conn = get_db_connection()
    if conn:
        conn.close()
        return True
    return False


def seed_from_csv():
    """Migrates data from data/sessions CSVs into MySQL tables."""
    conn = get_db_connection()
    if not conn:
        print("[DB] Cannot seed: MySQL is not reachable.")
        return False

    try:
        with conn.cursor() as cursor:
            for session in analyze.sessions():
                folder = os.path.join(analyze.SESSIONS, session)
                answer_path = os.path.join(folder, "answer.txt")
                answer = ""
                if os.path.exists(answer_path):
                    with open(answer_path) as f:
                        answer = f.read().strip()

                # Insert session
                cursor.execute(
                    "INSERT INTO sessions (name, answer_key) VALUES (%s, %s) "
                    "ON DUPLICATE KEY UPDATE answer_key = VALUES(answer_key)",
                    (session, answer)
                )
                cursor.execute("SELECT id FROM sessions WHERE name = %s", (session,))
                session_id = cursor.fetchone()["id"]

                # Seed report if exists
                report_path = os.path.join(folder, "report.md")
                if os.path.exists(report_path):
                    with open(report_path) as f:
                        report_md = f.read()
                    cursor.execute(
                        "INSERT INTO reports (session_id, report_markdown) VALUES (%s, %s) "
                        "ON DUPLICATE KEY UPDATE report_markdown = VALUES(report_markdown)",
                        (session_id, report_md)
                    )

                # Check if metrics already populated
                cursor.execute("SELECT COUNT(*) AS cnt FROM metrics WHERE session_id = %s", (session_id,))
                if cursor.fetchone()["cnt"] == 0:
                    rows, apache, complaints = analyze.load(session)
                    
                    # Insert metrics
                    metric_rows = [
                        (
                            session_id,
                            r["timestamp"],
                            int(r.get("active_users", 0)),
                            float(r.get("response_time_ms", 0.0)),
                            float(r.get("cpu_usage_pct", 0.0)),
                            float(r.get("memory_usage_pct", 0.0)),
                            float(r.get("db_query_time_ms", 0.0)),
                            float(r.get("bandwidth_mbps", 0.0)),
                            int(r.get("error_count", 0)),
                        )
                        for r in rows
                    ]
                    if metric_rows:
                        cursor.executemany(
                            """INSERT INTO metrics 
                               (session_id, timestamp, active_users, response_time_ms, 
                                cpu_usage_pct, memory_usage_pct, db_query_time_ms, 
                                bandwidth_mbps, error_count) 
                               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                            metric_rows
                        )

                    # Insert complaints
                    complaint_rows = [
                        (session_id, c["timestamp"], c["complaint_text"])
                        for c in complaints
                    ]
                    if complaint_rows:
                        cursor.executemany(
                            "INSERT INTO complaints (session_id, timestamp, complaint_text) VALUES (%s, %s, %s)",
                            complaint_rows
                        )

                    # Insert apache logs if available
                    if apache:
                        log_rows = [
                            (session_id, l["timestamp"], l.get("level", "error"), l.get("message", ""))
                            for l in apache
                        ]
                        if log_rows:
                            cursor.executemany(
                                "INSERT INTO apache_logs (session_id, timestamp, level, message) VALUES (%s, %s, %s, %s)",
                                log_rows
                            )

            conn.commit()
            print("[DB] Seeding from CSV files completed successfully!")
            return True
    except Exception as e:
        conn.rollback()
        print(f"[DB] Seeding failed: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    seed_from_csv()

