import sqlite3
import requests
import json
import time
import os

DB_PATH = os.getenv("SQLITE_DB_PATH", "database.db")
SERVER_URL = os.getenv("SERVER_URL", "https://pup-bataan-gate.netlify.app")
GATE_SECRET = os.getenv("GATE_API_SECRET", "pup_bataan_gate_device_secret_secure_key_2026")
GATE_CODE = os.getenv("GATE_CODE", "GATE-01")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def sync_students_down():
    """Pulls latest authorized students from cloud into local SQLite"""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT MAX(updated_at) as latest FROM authorized_students")
        row = cur.fetchone()
        since = row["latest"] if row and row["latest"] else None

        url = f"{SERVER_URL}/api/sync"
        if since:
            url += f"?since={since}"

        headers = {"Authorization": f"Bearer {GATE_SECRET}"}
        res = requests.get(url, headers=headers, timeout=5)

        if res.status_code == 200:
            data = res.json()
            students = data.get("students", [])
            for s in students:
                cur.execute("""
                    INSERT INTO authorized_students (student_number, full_name, rfid_uid, qr_code, status, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(student_number) DO UPDATE SET
                        full_name = excluded.full_name,
                        rfid_uid = excluded.rfid_uid,
                        qr_code = excluded.qr_code,
                        status = excluded.status,
                        updated_at = excluded.updated_at
                """, (
                    s["student_number"],
                    f"{s.get('first_name', '')} {s.get('last_name', '')}",
                    s.get("rfid_uid"),
                    s.get("qr_code"),
                    s.get("status", "active"),
                    s.get("updated_at")
                ))
            conn.commit()
            print(f"[SYNC] Synced {len(students)} student credentials to local SQLite")
    except Exception as e:
        print(f"[SYNC_WARN] Student sync skipped (offline or server unreachable): {e}")

def sync_events_up():
    """Pushes unsynced offline events from local SQLite to cloud Netlify API"""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM pending_events WHERE synced = 0 ORDER BY scanned_at ASC LIMIT 50")
        rows = cur.fetchall()

        if not rows:
            return

        events = []
        for r in rows:
            events.append({
                "device_event_id": r["event_id"],
                "credential": r["credential"],
                "type": r["type"],
                "gate_code": r["gate_code"],
                "direction": r["direction"],
                "scanned_at": r["scanned_at"]
            })

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GATE_SECRET}"
        }
        res = requests.post(f"{SERVER_URL}/api/sync", json={"events": events}, headers=headers, timeout=8)

        if res.status_code == 200:
            data = res.json()
            synced_ids = data.get("syncedIds", [])
            for event_id in synced_ids:
                cur.execute("UPDATE pending_events SET synced = 1 WHERE event_id = ?", (event_id,))
            conn.commit()
            print(f"[SYNC] Successfully uploaded {len(synced_ids)} offline scan events to cloud")
    except Exception as e:
        print(f"[SYNC_WARN] Event upload pending (offline): {e}")

if __name__ == "__main__":
    print("[SYNC] Running initial sync...")
    sync_students_down()
    sync_events_up()
