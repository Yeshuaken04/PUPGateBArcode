-- ============================================================================
-- PUP BATAAN AUTOMATED GATE SYSTEM - COMPLETE DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Linked with Supabase Auth auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guard' CHECK (role IN ('super_admin', 'admin', 'faculty', 'guard', 'viewer')),
  active BOOLEAN DEFAULT TRUE,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. STUDENTS / PERSONNEL TABLE (Students, Faculty, Staff, Visitors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  person_type TEXT NOT NULL DEFAULT 'student' CHECK (person_type IN ('student', 'faculty', 'staff', 'visitor')),
  department TEXT,
  course TEXT,
  year_level INTEGER,
  section TEXT,
  contact_number TEXT,
  rfid_uid TEXT UNIQUE,
  qr_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_number ON public.students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_person_type ON public.students(person_type);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students(department);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_rfid ON public.students(rfid_uid) WHERE rfid_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_qr ON public.students(qr_code) WHERE qr_code IS NOT NULL;

-- ============================================================================
-- 3. VEHICLES TABLE (Registered Student Vehicles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  plate_number TEXT UNIQUE NOT NULL,
  brand_model TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'motorcycle' CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'bicycle', 'other')),
  color TEXT,
  valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate_number ON public.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_student_id ON public.vehicles(student_id);

-- ============================================================================
-- 4. GATES TABLE (Physical Turnstiles / Barrier Gates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_code TEXT UNIQUE NOT NULL,
  gate_name TEXT NOT NULL,
  location TEXT,
  direction TEXT NOT NULL DEFAULT 'both' CHECK (direction IN ('entry', 'exit', 'both')),
  device_id TEXT UNIQUE,
  device_secret_hash TEXT,
  active BOOLEAN DEFAULT TRUE,
  relay_pulse_ms INTEGER DEFAULT 800,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gates_gate_code ON public.gates(gate_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gates_device_id ON public.gates(device_id) WHERE device_id IS NOT NULL;

-- ============================================================================
-- 5. ACCESS LOGS TABLE (Comprehensive Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  gate_id UUID REFERENCES public.gates(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('entry', 'exit')),
  credential_type TEXT CHECK (credential_type IN ('rfid', 'qr', 'manual', 'plate', 'barcode')),
  credential_value TEXT,
  result TEXT NOT NULL CHECK (result IN ('allowed', 'denied', 'duplicate', 'offline')),
  denial_reason TEXT,
  device_event_id TEXT UNIQUE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_student ON public.access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_vehicle ON public.access_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_gate ON public.access_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_direction ON public.access_logs(direction);
CREATE INDEX IF NOT EXISTS idx_access_logs_result ON public.access_logs(result);
CREATE INDEX IF NOT EXISTS idx_access_logs_scanned_at ON public.access_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_student_time ON public.access_logs(student_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_gate_time ON public.access_logs(gate_id, scanned_at DESC);

-- ============================================================================
-- 6. STUDENT CURRENT PRESENCE TABLE (Realtime Campus Headcount)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_presence (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'outside' CHECK (current_status IN ('inside', 'outside', 'unknown')),
  last_gate_id UUID REFERENCES public.gates(id) ON DELETE SET NULL,
  last_scan_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_presence_status ON public.student_presence(current_status);

-- ============================================================================
-- 7. MANUAL GATE ACTIONS TABLE (Audit Log for Manual Overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id UUID REFERENCES public.gates(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('open', 'close', 'emergency_open')),
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_actions_gate ON public.gate_actions(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_actions_created_at ON public.gate_actions(created_at DESC);

-- ============================================================================
-- 8. ATOMIC STORED FUNCTION: PROCESS GATE SCAN (Transaction Safe)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_gate_scan(
  p_credential TEXT,
  p_type TEXT,
  p_gate_code TEXT,
  p_direction TEXT,
  p_device_event_id TEXT DEFAULT NULL,
  p_scanned_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gate RECORD;
  v_student RECORD;
  v_vehicle RECORD;
  v_last_scan TIMESTAMPTZ;
  v_result TEXT;
  v_denial_reason TEXT := NULL;
  v_log_id UUID;
  v_event_id TEXT;
  v_norm_credential TEXT;
BEGIN
  -- Normalize credential
  v_norm_credential := UPPER(TRIM(p_credential));

  -- 1. Find gate
  SELECT * INTO v_gate FROM public.gates WHERE gate_code = p_gate_code AND active = TRUE LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'action', 'KEEP_CLOSED',
      'reason', 'INVALID_OR_INACTIVE_GATE'
    );
  END IF;

  -- 2. Find student by RFID or QR
  IF LOWER(p_type) = 'rfid' THEN
    SELECT * INTO v_student FROM public.students WHERE rfid_uid = v_norm_credential LIMIT 1;
  ELSE
    SELECT * INTO v_student FROM public.students WHERE qr_code = v_norm_credential LIMIT 1;
  END IF;

  -- If not found by card/qr, try finding by student_number or barcode
  IF NOT FOUND THEN
    SELECT * INTO v_student FROM public.students WHERE student_number = v_norm_credential LIMIT 1;
  END IF;

  -- Check if credential corresponds to vehicle plate number directly
  IF NOT FOUND THEN
    SELECT * INTO v_vehicle FROM public.vehicles WHERE UPPER(REPLACE(plate_number, ' ', '')) = UPPER(REPLACE(v_norm_credential, ' ', '')) AND is_active = TRUE LIMIT 1;
    IF FOUND THEN
      SELECT * INTO v_student FROM public.students WHERE id = v_vehicle.student_id LIMIT 1;
    END IF;
  ELSE
    -- Try finding associated vehicle for this student
    SELECT * INTO v_vehicle FROM public.vehicles WHERE student_id = v_student.id AND is_active = TRUE LIMIT 1;
  END IF;

  -- 3. Validate student existence and active status
  IF v_student.id IS NULL THEN
    v_result := 'denied';
    v_denial_reason := 'CREDENTIAL_NOT_FOUND';
  ELSIF v_student.status <> 'active' THEN
    v_result := 'denied';
    v_denial_reason := 'STUDENT_' || UPPER(v_student.status);
  ELSE
    -- 4. Check for duplicate scan cooldown (prevent double tap within 3.5 seconds)
    SELECT scanned_at INTO v_last_scan
    FROM public.access_logs
    WHERE student_id = v_student.id
      AND gate_id = v_gate.id
      AND scanned_at >= (p_scanned_at - INTERVAL '3.5 seconds')
    ORDER BY scanned_at DESC
    LIMIT 1;

    IF FOUND THEN
      v_result := 'duplicate';
      v_denial_reason := 'DUPLICATE_SCAN_COOLDOWN';
    ELSE
      v_result := 'allowed';
    END IF;
  END IF;

  -- Generate device event id if null
  v_event_id := COALESCE(p_device_event_id, v_gate.gate_code || '-' || EXTRACT(EPOCH FROM p_scanned_at)::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  -- 5. Insert Access Log (Idempotent using device_event_id)
  INSERT INTO public.access_logs (
    student_id,
    vehicle_id,
    gate_id,
    direction,
    credential_type,
    credential_value,
    result,
    denial_reason,
    device_event_id,
    scanned_at,
    created_at
  ) VALUES (
    v_student.id,
    v_vehicle.id,
    v_gate.id,
    LOWER(p_direction),
    LOWER(p_type),
    v_norm_credential,
    v_result,
    v_denial_reason,
    v_event_id,
    p_scanned_at,
    NOW()
  )
  ON CONFLICT (device_event_id) DO NOTHING
  RETURNING id INTO v_log_id;

  -- 6. If authorized, atomically update student_presence
  IF v_result = 'allowed' THEN
    INSERT INTO public.student_presence (
      student_id,
      current_status,
      last_gate_id,
      last_scan_at,
      updated_at
    ) VALUES (
      v_student.id,
      CASE WHEN LOWER(p_direction) = 'entry' THEN 'inside' ELSE 'outside' END,
      v_gate.id,
      p_scanned_at,
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE SET
      current_status = EXCLUDED.current_status,
      last_gate_id = EXCLUDED.last_gate_id,
      last_scan_at = EXCLUDED.last_scan_at,
      updated_at = NOW();
  END IF;

  -- 7. Update gate heartbeat
  UPDATE public.gates SET last_seen_at = NOW() WHERE id = v_gate.id;

  -- Return structured response
  RETURN jsonb_build_object(
    'allowed', (v_result = 'allowed'),
    'action', CASE WHEN v_result = 'allowed' THEN 'OPEN' ELSE 'KEEP_CLOSED' END,
    'result', v_result,
    'reason', v_denial_reason,
    'student', CASE WHEN v_student.id IS NOT NULL THEN jsonb_build_object(
      'id', v_student.id,
      'studentNumber', v_student.student_number,
      'fullName', v_student.first_name || ' ' || COALESCE(v_student.middle_name || ' ', '') || v_student.last_name,
      'personType', COALESCE(v_student.person_type, 'student'),
      'department', v_student.department,
      'course', v_student.course,
      'yearLevel', v_student.year_level,
      'status', v_student.status
    ) ELSE NULL END,
    'vehicle', CASE WHEN v_vehicle.id IS NOT NULL THEN jsonb_build_object(
      'plateNumber', v_vehicle.plate_number,
      'brandModel', v_vehicle.brand_model,
      'type', v_vehicle.vehicle_type
    ) ELSE NULL END,
    'gate', jsonb_build_object(
      'code', v_gate.gate_code,
      'name', v_gate.gate_name,
      'direction', p_direction
    ),
    'deviceEventId', v_event_id,
    'timestamp', p_scanned_at
  );
END;
$$;

-- ============================================================================
-- 9. AUTH HOOK TRIGGER (Auto-create profile when a user signs up)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guard'),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_actions ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- PROFILES Policies
CREATE POLICY "Profiles readable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles updatable by super_admin and admin" ON public.profiles
  FOR ALL TO authenticated USING (
    public.current_user_role() IN ('super_admin', 'admin')
  );

-- STUDENTS Policies
CREATE POLICY "Students readable by authenticated users" ON public.students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students editable by admin or faculty" ON public.students
  FOR ALL TO authenticated USING (
    public.current_user_role() IN ('super_admin', 'admin', 'faculty')
  );

-- VEHICLES Policies
CREATE POLICY "Vehicles readable by authenticated users" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vehicles editable by admin or super_admin" ON public.vehicles
  FOR ALL TO authenticated USING (
    public.current_user_role() IN ('super_admin', 'admin')
  );

-- GATES Policies
CREATE POLICY "Gates readable by authenticated users" ON public.gates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gates editable by admin or super_admin" ON public.gates
  FOR ALL TO authenticated USING (
    public.current_user_role() IN ('super_admin', 'admin')
  );

-- ACCESS LOGS Policies
CREATE POLICY "Logs readable by authenticated users" ON public.access_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Logs insertable by system or guards" ON public.access_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- STUDENT PRESENCE Policies
CREATE POLICY "Presence readable by authenticated users" ON public.student_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Presence modifiable by authenticated users" ON public.student_presence
  FOR ALL TO authenticated USING (true);

-- GATE ACTIONS Policies
CREATE POLICY "Gate actions readable by authenticated users" ON public.gate_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gate actions insertable by admin or guard" ON public.gate_actions
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin', 'guard')
  );

-- ============================================================================
-- 11. ENABLE REALTIME PUBLICATION FOR LIVE MONITORING
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.access_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gates;

-- ============================================================================
-- 12. SEED INITIAL DATA
-- ============================================================================
INSERT INTO public.gates (gate_code, gate_name, location, direction, device_id, active, relay_pulse_ms)
VALUES
  ('GATE-01', 'Main Entrance Gate', 'Main Campus Gate 1', 'entry', 'CONTROLLER-01', TRUE, 800),
  ('GATE-02', 'Main Exit Gate', 'Main Campus Gate 2', 'exit', 'CONTROLLER-02', TRUE, 800)
ON CONFLICT (gate_code) DO NOTHING;

INSERT INTO public.students (student_number, first_name, middle_name, last_name, course, year_level, section, contact_number, rfid_uid, qr_code, status)
VALUES
  ('2021-12345', 'Juan', 'M.', 'Dela Cruz', 'BSIT', 3, 'A', '09171234567', 'RFID-A101', 'QR-PUP-2021-12345', 'active'),
  ('2022-06789', 'Maria', 'S.', 'Santos', 'BSBA', 2, 'B', '09181234567', 'RFID-B202', 'QR-PUP-2022-06789', 'active'),
  ('2021-09876', 'Mark', 'P.', 'Reyes', 'BSEE', 4, 'A', '09191234567', 'RFID-C303', 'QR-PUP-2021-09876', 'active'),
  ('2023-11223', 'Ana', 'L.', 'Cruz', 'BSCE', 1, 'C', '09061234567', 'RFID-D404', 'QR-PUP-2023-11223', 'active')
ON CONFLICT (student_number) DO NOTHING;

INSERT INTO public.vehicles (student_id, plate_number, brand_model, vehicle_type, color, is_active)
SELECT id, 'ABC-1234', 'Yamaha Aerox 155', 'motorcycle', 'Black', TRUE FROM public.students WHERE student_number = '2021-12345'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO public.vehicles (student_id, plate_number, brand_model, vehicle_type, color, is_active)
SELECT id, 'DEF-5678', 'Honda Click 125', 'motorcycle', 'Red', TRUE FROM public.students WHERE student_number = '2022-06789'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO public.vehicles (student_id, plate_number, brand_model, vehicle_type, color, is_active)
SELECT id, 'GHI-9012', 'Toyota Vios', 'car', 'White', TRUE FROM public.students WHERE student_number = '2021-09876'
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO public.vehicles (student_id, plate_number, brand_model, vehicle_type, color, is_active)
SELECT id, 'JKL-3456', 'Mitsubishi Mirage', 'car', 'Gray', TRUE FROM public.students WHERE student_number = '2023-11223'
ON CONFLICT (plate_number) DO NOTHING;
