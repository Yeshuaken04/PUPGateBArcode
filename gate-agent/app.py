import os
import sys
import time
import uuid
import sqlite3
import threading
import requests
from datetime import datetime

from scanner import ScannerReader
from barrier import BarrierController
from sync import sync_students_down, sync_events_up

DB_PATH = os.getenv("SQLITE_DB_PATH", "database.db")
SERVER_URL = os.getenv("SERVER_URL", "https://pup-bataan-gate.netlify.app")
GATE_SECRET = os.getenv("GATE_API_SECRET", "pup_bataan_gate_device_secret_secure_key_2026")
GATE_CODE = os.getenv("GATE_CODE", "GATE-01")
DIRECTION = os.getenv("GATE_DIRECTION", "entry")

def init_local_database():
    """Initializes local SQLite database if not present"""
    conn = sqlite3.connect(DB_PATH)
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("[INIT] Local SQLite database verified")

def background_sync_worker():
    """Syncs student changes and uploads pending offline events every 60 seconds"""
    while True:
        try:
            sync_students_down()
            sync_events_up()
            # Send gate heartbeat to cloud
            requests.get(
                f"{SERVER_URL}/api/health?gate={GATE_CODE}",
                headers={"Authorization": f"Bearer {GATE_SECRET}"},
                timeout=5
            )
        except Exception:
            pass
        time.sleep(60)

def main():
    print("=" * 65)
    print(f"PUP BATAAN AUTOMATED GATE CONTROLLER AGENT")
    print(f"Gate Code: {GATE_CODE} | Direction: {DIRECTION.upper()}")
    print(f"Cloud Server: {SERVER_URL}")
    print("=" * 65)

    init_local_database()

    # Launch background sync
    sync_thread = threading.Thread(target=background_sync_worker, daemon=True)
    sync_thread.start()

    reader = ScannerReader()
    barrier = BarrierController()

    while True:
        token = reader.read_token()
        if not token:
            continue

        scanned_at = datetime.utcnow().isoformat() + "Z"
        event_id = f"{GATE_CODE}-{int(time.time())}-{uuid.uuid4().hex[:6]}"

        print(f"\n[SCAN] Token Scanned: {token}")

        # 1. TRY ONLINE VALIDATION (Netlify API + Supabase)
        online_success = False
        try:
            payload = {
                "credential": token,
                "type": "rfid" if token.startswith("RFID") or len(token) <= 12 else "qr",
                "gateCode": GATE_CODE,
                "direction": DIRECTION,
                "deviceEventId": event_id
            }
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GATE_SECRET}"
            }

            res = requests.post(f"{SERVER_URL}/api/scan", json=payload, headers=headers, timeout=2.5)
            if res.status_code == 200:
                data = res.json()
                online_success = True
                if data.get("allowed"):
                    student = data.get("student", {})
                    print(f"[ONLINE AUTHORIZED] Access Granted for: {student.get('fullName')} ({student.get('studentNumber')})")
                    barrier.open_gate(reason=f"Online scan: {token}")
                else:
                    print(f"[ONLINE DENIED] Access Denied: {data.get('reason')}")
            else:
                print(f"[CLOUD_REJECT] Status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[OFFLINE_FALLBACK] Cloud unreachable ({e}). Switching to local SQLite...")

        # 2. OFFLINE FALLBACK (If Cloud was Unreachable)
        if not online_success:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("""
                SELECT * FROM authorized_students 
                WHERE (UPPER(rfid_uid) = UPPER(?) OR UPPER(qr_code) = UPPER(?) OR UPPER(student_number) = UPPER(?))
                  AND status = 'active'
                LIMIT 1
            """, (token, token, token))
            row = cur.fetchone()

            if row:
                print(f"[OFFLINE AUTHORIZED] Student found in local database: {row[1]} ({row[0]})")
                barrier.open_gate(reason=f"Offline scan: {row[0]}")

                # Queue pending offline event for subsequent cloud upload
                cur.execute("""
                    INSERT INTO pending_events (event_id, student_number, credential, type, gate_code, direction, scanned_at, synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """, (
                    event_id,
                    row[0],
                    token,
                    "rfid" if token.startswith("RFID") else "qr",
                    GATE_CODE,
                    DIRECTION,
                    scanned_at
                ))
                conn.commit()
                print(f"[OFFLINE BUFFER] Event queued in SQLite for synchronization")
            else:
                print(f"[OFFLINE DENIED] Credential not found in local cache: {token}")
            conn.close()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[STOP] Controller agent terminated.")
