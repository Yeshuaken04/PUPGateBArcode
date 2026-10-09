export type UserRole = 'super_admin' | 'admin' | 'faculty' | 'guard' | 'viewer';
export type StudentStatus = 'active' | 'inactive' | 'suspended' | 'graduated';
export type PersonType = 'student' | 'faculty' | 'staff' | 'visitor';
export type GateDirection = 'entry' | 'exit' | 'both';
export type AccessResult = 'allowed' | 'denied' | 'duplicate' | 'offline';
export type PresenceStatus = 'inside' | 'outside' | 'unknown';
export type CredentialType = 'rfid' | 'qr' | 'manual' | 'plate' | 'barcode';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  department?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  person_type: PersonType;
  course?: string | null;
  department?: string | null;
  year_level?: number | null;
  section?: string | null;
  contact_number?: string | null;
  rfid_uid?: string | null;
  qr_code?: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  student_id: string;
  plate_number: string;
  brand_model: string;
  vehicle_type: 'motorcycle' | 'car' | 'van' | 'bicycle' | 'other';
  color?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  student?: Student;
}

export interface Gate {
  id: string;
  gate_code: string;
  gate_name: string;
  location?: string | null;
  direction: GateDirection;
  device_id?: string | null;
  device_secret_hash?: string | null;
  active: boolean;
  relay_pulse_ms: number;
  last_seen_at?: string | null;
  created_at: string;
}

export interface AccessLog {
  id: string;
  student_id?: string | null;
  vehicle_id?: string | null;
  gate_id?: string | null;
  direction: 'entry' | 'exit';
  credential_type?: CredentialType | null;
  credential_value?: string | null;
  result: AccessResult;
  denial_reason?: string | null;
  device_event_id?: string | null;
  scanned_at: string;
  synced_at?: string | null;
  created_at: string;
  student?: Student | null;
  vehicle?: Vehicle | null;
  gate?: Gate | null;
}

export interface StudentPresence {
  student_id: string;
  current_status: PresenceStatus;
  last_gate_id?: string | null;
  last_scan_at?: string | null;
  updated_at: string;
  student?: Student;
  gate?: Gate;
}

export interface GateAction {
  id: string;
  gate_id: string;
  initiated_by?: string | null;
  action: 'open' | 'close' | 'emergency_open';
  reason?: string | null;
  ip_address?: string | null;
  created_at: string;
  gate?: Gate;
  profile?: Profile;
}

export interface ScanApiResponse {
  allowed: boolean;
  action: 'OPEN' | 'KEEP_CLOSED';
  result: AccessResult;
  reason?: string | null;
  student?: {
    id: string;
    studentNumber: string;
    fullName: string;
    personType?: PersonType | null;
    course?: string | null;
    department?: string | null;
    yearLevel?: number | null;
    status: StudentStatus;
  } | null;
  vehicle?: {
    plateNumber: string;
    brandModel: string;
    type: string;
  } | null;
  gate?: {
    code: string;
    name: string;
    direction: string;
  } | null;
  deviceEventId: string;
  timestamp: string;
}
