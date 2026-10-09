# PUP Bataan - Automated Vehicle Gate Pass & Barrier Security System

Fullstack production-ready gate barrier and turnstile management web system built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL & Auth**, **Netlify Serverless Deployment**, and **Raspberry Pi / ESP32 Local Gate Controller with SQLite Offline Fallback**.

---

## 🏛️ System Architecture

```text
STUDENTS / ADMIN / GUARD
          │
          ▼
   Next.js Web App
          │
          ▼
      NETLIFY
┌────────────────────────┐
│  - Frontend Web UI     │
│  - App Router APIs     │
│  - Edge Middleware     │
└───────────┬────────────┘
            │ HTTPS (Encrypted)
            ▼
        SUPABASE
┌────────────────────────┐
│  - PostgreSQL Database │
│  - Supabase Auth       │
│  - Row Level Security  │
│  - Realtime WebSocket  │
└───────────┬────────────┘
            │
            ▼ Two-Way Sync / API
     SCHOOL NETWORK
┌────────────────────────┐
│   Raspberry Pi / ESP32 │
│   - Local SQLite Cache │
│   - RFID / Barcode HID │
│   - Relay Controller   │
└───────────┬────────────┘
            │ 800ms Pulse
            ▼
    AUTOMATIC BARRIER
```

---

## 🔒 Security & Access Protection

This system is built with strict multi-layered security so unauthorized individuals cannot access the dashboard, logs, or gate controls:

1. **Next.js Edge Middleware (`src/middleware.ts`)**:
   * Intercepts every incoming request before pages load.
   * Unauthenticated visitors attempting to access `/dashboard`, `/students`, `/access-logs`, `/gates`, `/users`, `/reports`, or `/settings` are **immediately redirected to `/login`**.
2. **Supabase Authentication**:
   * Uses encrypted HTTP-only session cookies with token refresh.
3. **Role-Based Access Control (RBAC)**:
   * **Super Admin**: Full permissions, manage administrators, manage hardware security keys.
   * **Admin**: Student enrollment, vehicle pass management, gate controls, and compliance reports.
   * **Guard**: Live access feed monitoring, manual gate open override with required audit reasons.
   * **Viewer**: Read-only access to audit logs and statistics.
4. **PostgreSQL Row Level Security (RLS)**:
   * Strict policies on all tables (`profiles`, `students`, `vehicles`, `gates`, `access_logs`, `student_presence`, `gate_actions`).
5. **Hardware Device Authentication**:
   * Gate controllers (Raspberry Pi / ESP32) authenticate using `Bearer <GATE_API_SECRET>`. Unauthenticated requests to `/api/scan` and `/api/sync` are rejected immediately.
6. **Double-Tap / Duplicate Scan Protection**:
   * Hardware cooldown (3.5 seconds) prevents accidental double-opening and replay attacks.
7. **Idempotent Synchronization**:
   * Uses `device_event_id` to guarantee that offline re-syncs never insert duplicate access logs.

---

## 🚀 Step 1: Supabase Setup (PostgreSQL Database)

1. Create a free project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase project dashboard.
3. Open the file [`supabase/schema.sql`](file:///d:/CAPSTONE%20TANGINA/supabase/schema.sql) in this repository and copy all its contents.
4. Paste the SQL into the Supabase SQL Editor and click **Run**.
   * This creates all tables (`profiles`, `students`, `vehicles`, `gates`, `access_logs`, `student_presence`, `gate_actions`), indexes, RLS policies, realtime publications, and the atomic `process_gate_scan` stored procedure.
5. Go to **Project Settings → API** to copy:
   * **Project URL**
   * **Project API Keys (`anon` / public)**
   * **Project API Keys (`service_role` / secret)**

---

## 🌐 Step 2: Netlify Deployment

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Next.js Supabase Netlify fullstack gate system"
   git push origin main
   ```
2. Log in to [Netlify](https://www.netlify.com) and click **"Add new site" → "Import an existing project" → "GitHub"**.
3. Select your repository `PUP-BATAAN-Automated-gate-pass`.
4. Netlify will automatically detect **Next.js** using [`netlify.toml`](file:///d:/CAPSTONE%20TANGINA/netlify.toml).
5. In Netlify **Site configuration → Environment variables**, add:
   | Variable Name | Value | Description |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Public / Anon Key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Supabase Server Service Role Key |
   | `GATE_API_SECRET` | `pup_bataan_gate_device_secret_secure_key_2026` | Secure device token (32+ chars) |
6. Click **Deploy Site**. Netlify will build and host your system with global CDN caching and HTTPS.

---

## 💻 Step 3: Local Development (Windows)

1. Ensure dependencies are installed:
   ```cmd
   npm install
   ```
2. Run the development server:
   ```cmd
   npm run dev
   ```
   *(Or double-click `start-dev.bat`)*
3. Open your browser at **http://localhost:3000**.
4. Log in using pre-configured demo credentials:
   * **Administrator**: `admin@pup.edu.ph` / `PUPBataan@123`
   * **Gate Guard**: `guard@pup.edu.ph` / `guard123`

---

## 🔌 Step 4: Raspberry Pi Hardware Agent (`gate-agent/`)

For on-site gate controllers connected to physical barrier relays and USB RFID / barcode scanners:

```bash
cd gate-agent
pip install requests RPi.GPIO
cp config.env.example config.env
nano config.env
python app.py
```

* **Online mode**: Sends card/QR scans in real-time to your Netlify deployment (`POST /api/scan`).
* **Offline fallback**: If internet is down, automatically checks local SQLite (`authorized_students`) and pulses the relay immediately. Buffered scans upload automatically once internet is restored.

---

## 📋 Features Included

* ✅ **Separate Entry and Exit Dashboards**: Dedicated inbound (`/access-logs?mode=entry`) and outbound (`/access-logs?mode=exit`) monitoring with specific KPI metrics.
* ✅ **Live Search by Student Name & Plate Number**: Instant filtering by vehicle license plate, student name, student ID, and brand/model.
* ✅ **Student Management**: Full CRUD, active/suspended status, RFID UID assignment, and printable card passes.
* ✅ **Vehicle Registry**: Motorbikes and cars linked to students with plate number badges.
* ✅ **Manual Barrier Override**: Secure modal with mandatory audit reason logging (`gate_actions`).
* ✅ **Reports & Analytics**: Daily and monthly traffic analysis, peak hour monitoring, and CSV export.
* ✅ **Live Scanner Simulator**: Test scans directly in your browser (`/live`).
