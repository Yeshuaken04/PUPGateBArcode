# Raspberry Pi / ESP32 Local Gate Barrier Controller

This folder contains the on-site gate controller agent running on a Raspberry Pi connected to physical RFID / QR scanner hardware and automatic barrier relays.

## Hardware Wiring
* **Relay Pin**: GPIO 18 (BCM Pin 18, Physical Pin 12) to Barrier Relay Board `IN` pin.
* **RFID Scanner**: USB HID Card Reader or Serial Reader.
* **Barcode / QR Scanner**: USB HID Scanner.

## Features
1. **Cloud Online Validation**: Sends scans to `POST /api/scan` on Netlify/Supabase in real-time.
2. **Offline SQLite Fallback**: If campus internet is down, automatically validates against local `authorized_students` SQLite cache and opens the barrier without delay.
3. **Idempotent Synchronization**: Buffers offline events in `pending_events` and syncs with cloud when connectivity returns.

## Setup Instructions
```bash
# 1. Install Python dependencies
pip install requests RPi.GPIO

# 2. Copy and configure environment variables
cp config.env.example config.env
nano config.env

# 3. Run the controller
python app.py
```
